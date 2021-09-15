import { default as bodyParser, default as express } from "express";
import * as admin from "firebase-admin";
import { firestore } from "firebase-admin";
import {
  ContactGroupSchema,
  dContactSuggestion,
  FRBS_ROLE,
  iCollection,
  iDBList,
  MobileScoreboardSchema,
  MobileUserSchema,
  THEME,
  WebScoreboardSchema,
  WebUserSchema,
} from "./migrationSchema";

const PORT = 3001;
const app = express();
const router = express.Router();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/", router);

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

router.post("/migration", async (req, res) => {
  const {
    dbNameList,
    collList,
    mapUserSchema,
    mapScoreboardSchema,
    clone,
    destDBSAFile,
  }: {
    dbNameList: iDBList[];
    collList: iCollection[];
    mapUserSchema: boolean;
    mapScoreboardSchema: boolean;
    clone: boolean;
    destDBSAFile: any;
  } = req.body;

  //#region This is Destination DB Area
  const destDBApp = initApp(
    JSON.parse(destDBSAFile).project_id,
    "destination",
    destDBSAFile
  );
  const destFS = destDBApp?.firestore();
  //#endregion

  //#region This is Source DB(s) area
  dbNameList.forEach(async (sourceDB) => {
    const sourceProjectId = sourceDB.projectId!.replace(
      "-service-account.json",
      ""
    );
    const sourceDBApp = initApp(sourceProjectId, "source");

    if (sourceDBApp !== undefined) {
      const collNames: string[] = await getCollections(sourceDBApp, collList);
      //console.log("Total Collections " + JSON.stringify(collNames));

      const sourceFS = sourceDBApp.firestore();
      collNames.forEach((coll) => {
        console.log(
          "Starting data move for " +
            sourceProjectId +
            " and collection " +
            coll
        );
        sourceFS
          .collection(coll)
          //.limit(1)
          //TODO COMMENT THIS AFTER TESTING
          //.where("email", "==", "mankar.saurabh@gmail.com")
          .get()
          .then((collDocSnap) => {
            collDocSnap.docs.forEach(async (collDoc) => {
              let outCollData: any;
              let tempProjectId = sourceProjectId;

              if (coll === "users" && mapUserSchema) {
                outCollData = {
                  ...mapUserSchemaToWeb(collDoc),
                  _teamId: collDoc.data()._teamId
                    ? collDoc.data()._teamId
                    : tempProjectId,
                };
              } else {
                outCollData = {
                  ...collDoc.data(),
                  _teamId: collDoc.data()._teamId
                    ? collDoc.data()._teamId
                    : tempProjectId,
                };
              }

              let newSBData;
              if (coll === "scoreboard" && mapScoreboardSchema) {
                if (collDoc.id !== "scores") return;
                newSBData = mapSBSchemaToWeb(collDoc);
                // console.log(JSON.stringify(newSBData));
              }

              //NOTE: Copy Source Collection Document to same collection in Destination ("pages" to "pages", "users" to "users" )
              /*NOTE: If you're not sure whether the document exists, pass the option to merge the new data 
                    with any existing document to avoid overwriting entire documents.
                    Example:
                    var cityRef = db.collection('cities').doc('BJ');
                    var setWithMerge = cityRef.set({
                        capital: true
                    }, { merge: true });
                    
              */

              //NOTE: Step-1: First Copy Collection Documents
              //     Exception. Some documents have named document ids rather than a random name.
              //     For those documents the doc Id is constructed as doc.id + projectId
              let tempCollDocId: string;
              switch (coll) {
                case "config":
                  tempCollDocId = clone
                    ? collDoc.id
                    : collDoc.id + "-" + sourceProjectId;
                  break;
                case "notifications":
                  tempCollDocId = clone
                    ? collDoc.id
                    : collDoc.id + "-" + sourceProjectId;
                  break;
                case "scoreboard":
                  tempCollDocId = "";
                  break;
                case "zoom":
                  tempCollDocId = clone
                    ? collDoc.id
                    : collDoc.id + "-" + sourceProjectId;
                  break;
                case "channels":
                  tempCollDocId = clone
                    ? collDoc.id
                    : collDoc.id + "-" + sourceProjectId;
                  break;
                default:
                  tempCollDocId = collDoc.id;
                  break;
              }

              const tempColl = coll === "pages" ? "PAGES" : coll;

              if (tempCollDocId === "" && coll === "scoreboard" && newSBData) {
                newSBData.forEach(async (scoreboard) => {
                  await destFS
                    ?.collection(coll)
                    .add({
                      _teamId: collDoc.data()._teamId
                        ? collDoc.data()._teamId
                        : sourceProjectId,
                      ...scoreboard,
                    })
                    .then(async function (newSBID) {
                      await destFS
                        .collection(coll)
                        .doc(newSBID.id)
                        .update({
                          _sbid: newSBID.id.replace("/scoreboard/", ""),
                        });
                    });
                });
              } else {
                //NOTE:We are moving defaultLists to code instead of firestore
                if (tempCollDocId.includes("variable")) {
                  delete outCollData.listBuilder;
                }

                if (tempColl === "possts") {
                  if (outCollData.goToPage && outCollData.goToPage !== "")
                    outCollData = {
                      ...outCollData,
                      goToPage: "page:" + outCollData.goToPage,
                    };
                }
                await destFS
                  ?.collection(tempColl)
                  .doc(tempCollDocId)
                  .set(outCollData, { merge: true });

                //TODO For Web User, move the listBuilder from MobileUserSchema to a sub-collection called contact-groups and contacts in WebUser document.
                if (tempColl === "users") {
                  const contactGroupDocs: ContactGroupSchema[] =
                    mapListBuilderToContactGroups(collDoc);
                  const listOfContacts: dContactSuggestion[] =
                    mapListBuilderToContacts(collDoc);

                  const destBatch = destDBApp?.firestore().batch();
                  contactGroupDocs.forEach((cgData) => {
                    const docRef = destFS
                      ?.collection(tempColl)
                      .doc(tempCollDocId)
                      .collection("contact-groups")
                      .doc(cgData._id);
                    if (docRef) destBatch?.set(docRef, cgData, { merge: true });
                  });

                  listOfContacts.forEach((contactData) => {
                    const docRef = destFS
                      ?.collection(tempColl)
                      .doc(tempCollDocId)
                      .collection("contacts")
                      .doc(contactData._cid);
                    if (docRef)
                      destBatch?.set(docRef, contactData, { merge: true });
                  });
                  await destBatch?.commit();
                }
              }

              //NOTE: Step-2: Then Copy all subcollection documents of the root Collection Document.
              if (coll !== "scoreboard") {
                sourceFS
                  .collection(coll)
                  .doc(collDoc.id)
                  .listCollections()
                  .then((subCollections) => {
                    subCollections.forEach((subCollection) => {
                      subCollection.get().then((subCollData) => {
                        subCollData.docs.forEach(async (subCollDoc) => {
                          await destFS
                            ?.collection(tempColl)
                            .doc(tempCollDocId)
                            .collection(subCollection.id)
                            .doc(subCollDoc.id)
                            .set(
                              { ...subCollDoc.data(), _id: subCollDoc.id },
                              { merge: true }
                            );
                        });
                      });
                    });
                  });
              }

              if (coll === "users" && mapUserSchema) {
                // console.log("Making UID Updates");
                updateUsersUID(outCollData, sourceDBApp, destDBApp).then(() => {
                  //console.log("Completed UID Update");
                });
              }
            });
            //
          });
      });
      //#endregion
    } else {
      console.log("Error with App Initialization for");
      res.send("Error while initializing the app");
    }
  });

  res.send("Migration Operation Completed!");
});

/**
 *
 * @param projectId Project Id from Firebase for different Production projects.
 * @returns initialized app based upon the service-account.json file
 */
function initApp(projectId: string, appType: string, fileData?: string) {
  let serviceAccount;
  try {
    if (appType === "source") {
      const credFileName = `../src/service-accounts-creds/${projectId}-service-account.json`;
      serviceAccount = require(credFileName);
    } else {
      if (fileData) {
        serviceAccount = JSON.parse(fileData);
      } else {
        console.log("Destination DB service account info not passed.");
      }
    }
  } catch (err) {
    console.log(projectId + " is not setup for collaboration yet.");
    return undefined;
  }

  let secondaryApp: admin.app.App = <admin.app.App>{};

  admin.apps.forEach((app) => {
    if (app?.name === `${projectId}`) {
      console.log("App is already available: ", JSON.stringify(app?.name));
      secondaryApp = app;
    }
  });

  if (secondaryApp.name !== undefined) {
    return secondaryApp;
  } else {
    console.log(
      "Initializing the " + appType + " app for teamID: " + projectId
    );
    return admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${projectId}.firebaseio.com`,
      },
      `${projectId}`
    );
  }
}

/**
 *
 * @param dbApp The initialized app for which we need to find all root collections
 * @returns Collections in firestore for the app that is passed.
 */
async function getCollections(
  dbApp: admin.app.App,
  collList: iCollection[]
): Promise<string[]> {
  const output = await dbApp
    .firestore()
    .listCollections()
    .then((collections) => {
      const output: string[] = [];
      collections.forEach((coll) => {
        if (collList.find((x) => x.collectionName === coll.id))
          //if (coll.id === "users")
          output.push(coll.id);
      });
      return output;
    });

  return output;
}

interface customMobileSBSchema {
  title: {
    data: MobileScoreboardSchema;
  };
}
function mapSBSchemaToWeb(
  collDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
) {
  //console.log("collDoc.id :>> ", collDoc.id);

  let mobileSchemaData = Object.values(<MobileScoreboardSchema>collDoc.data());
  let webSchemaData: WebScoreboardSchema[] = [];

  mobileSchemaData.map((mSB: MobileScoreboardSchema) => {
    let tempWSD: WebScoreboardSchema = {
      _sbid: "",
      title: mSB.title,
      subtitle: mSB.subtitle ? mSB.subtitle : "",
      people: mSB.people,
      position: mSB.position,
      id: mSB.id,
      createdAt: firestore.Timestamp.fromDate(new Date()),
    };
    //console.log("tempWSD :>> ", tempWSD);
    webSchemaData.push(tempWSD);
  });

  return webSchemaData;
}

function mapUserSchemaToWeb(
  collDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
) {
  let mobileUser = <MobileUserSchema>collDoc.data();
  const allLevelItems: string[] = [];
  if (mobileUser.levels) {
    mobileUser.levels.map((level: { [key: string]: any }) => {
      allLevelItems.push(...Object.keys(level));
    });
  }

  let webUser = <WebUserSchema>{
    theme: THEME.LIGHT,
    _id: collDoc.id,
    personali: {
      displayName: mobileUser.name ? mobileUser.name : "",
      email: mobileUser.email ? mobileUser.email : "",
      phoneNumber: mobileUser.phoneNumber ? mobileUser.phoneNumber : "",
      photoURL: mobileUser.profileImage ? mobileUser.profileImage : "",
    },
    completedLevelItems: allLevelItems,
    roles: [
      mobileUser.admin
        ? FRBS_ROLE.ADMIN
        : mobileUser.banned
        ? FRBS_ROLE.BANNED
        : FRBS_ROLE.NEWBIE,
    ],
    growth: {
      allLevelsCompleted: mobileUser.allLevelsCompleted
        ? mobileUser.allLevelsCompleted
        : {},
      levels: mobileUser.levels ? mobileUser.levels : {},
      team: collDoc.data().team ? collDoc.data().team : "",
    },
    //NOTE: Backing up data in a object rather than deleting it.
    oldMobileSchemaData: {
      uid: mobileUser.uid ? mobileUser.uid : "",
      email: mobileUser.email ? mobileUser.email : "",
      listBuilder: "",
      allLevelsCompleted: mobileUser.allLevelsCompleted
        ? mobileUser.allLevelsCompleted
        : "",
      levels: mobileUser.levels ? mobileUser.levels : "",
      profileImage: mobileUser.profileImage ? mobileUser.profileImage : "",
      phoneNumber: mobileUser.phoneNumber ? mobileUser.phoneNumber : "",
      name: mobileUser.name ? mobileUser.name : "",
      team: mobileUser.team ? mobileUser.team : "",
      admin: mobileUser.admin ? mobileUser.admin : false,
      banned: mobileUser.banned ? mobileUser.banned : false,
    },
  };

  delete mobileUser.uid;
  delete mobileUser.email;
  delete mobileUser.listBuilder;
  delete mobileUser.allLevelsCompleted;
  delete mobileUser.levels;
  delete mobileUser.profileImage;
  delete mobileUser.phoneNumber;
  delete mobileUser.name;
  delete mobileUser.team;
  delete mobileUser.admin;
  delete mobileUser.banned;

  webUser = { ...webUser, ...mobileUser };
  //console.log(webUser);
  return webUser;
}

async function updateUsersUID(
  outCollData: WebUserSchema,
  sourceDBApp: admin.app.App | undefined,
  destDBApp: admin.app.App | undefined
) {
  if (destDBApp === undefined) return;

  const admin = destDBApp;

  const email = outCollData.personali.email ? outCollData.personali.email : "";
  //console.log("Email is ", email);

  if (email === "" || email === undefined) return;

  //console.log("Inside updateUsersUID");
  let newUserOverrides = {
    uid: outCollData._id,
  };
  let oldUser: any;
  try {
    oldUser = await admin.auth().getUserByEmail(email!);

    if (oldUser.uid === outCollData._id || oldUser.email === email) {
      return;
    }
    await admin.auth().deleteUser(oldUser.uid);
  } catch (e) {
    try {
      oldUser = await sourceDBApp?.auth().getUserByEmail(email);
    } catch (e) {
      return;
    }
  }

  let dataToTransfer_keys = [
    "disabled",
    "displayName",
    "email",
    "emailVerified",
    "phoneNumber",
    "photoURL",
    "uid",
    "providerData",
  ];
  let newUserData: any = {};
  for (let key of dataToTransfer_keys) {
    newUserData[key] = oldUser[key];
  }
  Object.assign(newUserData, newUserOverrides);
  try {
    let newUser = await admin.auth().createUser(newUserData);
  } catch (e) {
    return;
  }
  //console.log("New user created ");
}
function mapListBuilderToContactGroups(
  collDoc: firestore.QueryDocumentSnapshot<firestore.DocumentData>
): ContactGroupSchema[] {
  const mobileData = <MobileUserSchema>collDoc.data();
  const results: ContactGroupSchema[] = [];
  const lists = mobileData.listBuilder?.lists
    ? mobileData.listBuilder?.lists
    : [];
  if (lists.length > 0) {
    lists.forEach((list) => {
      let tempData: ContactGroupSchema = <ContactGroupSchema>{};
      tempData._id = list.id === "Build My List" ? "BML" : list.id;
      tempData.groupType = "list";
      tempData.name = list.title;
      tempData.contacts = tempData.contacts ? tempData.contacts : [];
      list.contacts.forEach((contact) => {
        tempData.contacts.push(contact.recordID);
      });
      tempData.shareTo = mobileData.listBuilder?.shareTo
        ? mobileData.listBuilder.shareTo
        : [];
      results.push(tempData);
    });
    //console.log("results in mapLB TO CG :>> ", JSON.stringify(results));
  }
  return results;
}

function mapListBuilderToContacts(
  collDoc: firestore.QueryDocumentSnapshot<firestore.DocumentData>
): dContactSuggestion[] {
  const mobileData = <MobileUserSchema>collDoc.data();
  const results: dContactSuggestion[] = [];
  const lists = mobileData.listBuilder?.lists
    ? mobileData.listBuilder?.lists
    : [];
  if (lists.length > 0) {
    lists.forEach((list) => {
      list.contacts.forEach((contact) => {
        let tempData: dContactSuggestion = <dContactSuggestion>{};
        tempData._cid = contact.recordID;
        (tempData.displayName =
          contact.givenName + " " + contact.familyName
            ? contact.givenName + " " + contact.familyName
            : ""),
          (tempData.phoneNumbers = tempData.phoneNumbers
            ? tempData.phoneNumbers
            : []);
        contact.phoneNumbers.forEach((phoneNumber, index) => {
          tempData.phoneNumbers.push({
            ...phoneNumber,
            id: index.toString(),
          });
        });
        tempData.email =
          contact.emailAddresses && contact.emailAddresses.length > 0
            ? contact.emailAddresses[0].email
            : "";
        tempData.profileImage = contact.hasThumbnail
          ? contact.thumbnailPath
          : "";
        tempData._uid = "";
        tempData.pointers = "";
        tempData.points = [];
        tempData.listId = list.id === "Build My List" ? "BML" : list.id;
        tempData.lanePositionId = "0:0";
        results.push(tempData);
      });
    });
  }
  // console.log(
  //   "results after extracting contacts :>> ",
  //   JSON.stringify(results)
  // );
  return results;
}
