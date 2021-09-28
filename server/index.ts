import { default as bodyParser, default as express } from "express";
import * as admin from "firebase-admin";
import { firestore } from "firebase-admin";
import {
  ContactGroupSchema,
  dContactSuggestion,
  dPasswordHash,
  dUserPWDData,
  FRBS_ROLE,
  iCollection,
  iDBList,
  MediaPageItemSchema,
  MOBFPATH,
  MobileScoreboardSchema,
  MobileUserSchema,
  THEME,
  WEBFPATH,
  WebScoreboardSchema,
  WebUserSchema,
} from "./migrationSchema";
import { setup } from "./password-hash";

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
                  ...(await mapUserSchemaToWeb(sourceDBApp, collDoc)),
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

              const tempColl = coll === "pages" ? WEBFPATH.PAGES : coll;

              if (
                tempCollDocId === "" &&
                coll === WEBFPATH.SCOREBOARDS &&
                newSBData
              ) {
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

                if (tempColl === WEBFPATH.POSSTS) {
                  if (outCollData.goToPage && outCollData.goToPage !== "")
                    outCollData = {
                      ...outCollData,
                      goToPage: "page:" + outCollData.goToPage,
                    };
                }

                if (tempColl === WEBFPATH.PAGES) {
                  outCollData.mediaItem.team =
                    outCollData.mediaItem.team === "false"
                      ? false
                      : outCollData.mediaItem.team === "true"
                      ? true
                      : outCollData.mediaItem.team;
                }
                if (tempColl === WEBFPATH.MORE) {
                  outCollData = { ...outCollData, _id: tempCollDocId };
                }

                await destFS
                  ?.collection(tempColl)
                  .doc(tempCollDocId)
                  .set(outCollData, { merge: true });

                //TODO For Web User, move the listBuilder from MobileUserSchema to a sub-collection called contact-groups and contacts in WebUser document.
                if (tempColl === WEBFPATH.USERS) {
                  const contactGroupDocs: ContactGroupSchema[] =
                    mapListBuilderToContactGroups(collDoc);
                  const listOfContacts: dContactSuggestion[] =
                    mapListBuilderToContacts(collDoc);

                  const destBatch = destDBApp?.firestore().batch();
                  contactGroupDocs.forEach((cgData) => {
                    const docRef = destFS
                      ?.collection(tempColl)
                      .doc(tempCollDocId)
                      .collection(WEBFPATH.CONTACT_GROUPS)
                      .doc(cgData._id);
                    if (docRef) destBatch?.set(docRef, cgData, { merge: true });
                  });

                  listOfContacts.forEach((contactData) => {
                    const docRef = destFS
                      ?.collection(tempColl)
                      .doc(tempCollDocId)
                      .collection(WEBFPATH.CONTACTS)
                      .doc(contactData._cid);
                    if (docRef)
                      destBatch?.set(docRef, contactData, { merge: true });
                  });
                  await destBatch?.commit();
                }
              }

              //NOTE: Step-2: Then Copy all subcollection documents of the root Collection Document.
              if (coll !== WEBFPATH.SCOREBOARDS) {
                sourceFS
                  .collection(coll)
                  .doc(collDoc.id)
                  .listCollections()
                  .then((subCollections) => {
                    subCollections.forEach((subCollection) => {
                      subCollection.get().then((subCollData) => {
                        subCollData.docs.forEach(async (subCollDoc) => {
                          if (
                            subCollection.id === WEBFPATH.CUSTOM_PAGE_CONTENT
                          ) {
                            const tempPageContent = <MediaPageItemSchema>(
                              subCollDoc.data()
                            );
                            tempPageContent.topage = tempPageContent.topage
                              ? await getPageIdFromName(
                                  sourceDBApp,
                                  tempPageContent.topage
                                )
                              : "";
                            tempPageContent.url =
                              tempPageContent.topage &&
                              tempPageContent.topage.includes("page:")
                                ? tempPageContent.topage
                                : tempPageContent.url
                                ? tempPageContent.url
                                : "";
                          } else {
                            await destFS
                              ?.collection(tempColl)
                              .doc(tempCollDocId)
                              .collection(subCollection.id)
                              .doc(subCollDoc.id)
                              .set(
                                { ...subCollDoc.data(), _id: subCollDoc.id },
                                { merge: true }
                              );
                          }
                        });
                      });
                    });
                  });
              }

              if (coll === MOBFPATH.USERS && mapUserSchema) {
                // console.log("Making UID Updates");
                if (destDBApp)
                  createUserAuthInDestination(
                    outCollData,
                    sourceDBApp,
                    destDBApp
                  ).then(() => {
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

const mapUserSchemaToWeb = async (
  sourceDBApp: admin.app.App,
  collDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
) => {
  let mobileUser = <MobileUserSchema>collDoc.data();
  const userRoles: FRBS_ROLE[] = [];
  mobileUser.banned && userRoles.push(FRBS_ROLE.BANNED);
  mobileUser.admin
    ? userRoles.push(FRBS_ROLE.ADMIN)
    : userRoles.push(FRBS_ROLE.NEWBIE);
  const userBaseShopId = mobileUser.team
    ? await getPageIdFromName(sourceDBApp, mobileUser.team.teamName)
    : "";
  //@ts-ignore
  if (userBaseShopId) userRoles.push(FRBS_ROLE.BS + userBaseShopId);

  let webUser = <WebUserSchema>{
    theme: THEME.LIGHT,
    baseShopId: userBaseShopId,
    _id: collDoc.id,
    personali: {
      displayName: mobileUser.name ? mobileUser.name : "",
      email: mobileUser.email ? mobileUser.email : "",
      phoneNumber: mobileUser.phoneNumber ? mobileUser.phoneNumber : "",
      photoURL: mobileUser.profileImage ? mobileUser.profileImage : "",
    },
    completedLevelItems: mobileUser.levels
      ? getLevelNameAndItemsArray(mobileUser.levels)
      : [],
    roles: userRoles,
    growth: {
      allLevelsCompleted: mobileUser.allLevelsCompleted
        ? mobileUser.allLevelsCompleted
        : {},
      levels: mobileUser.levels ? mobileUser.levels : {},
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
};
const getLevelNameAndItemsArray = (levels: {
  [levelName: string]: any;
}): string[] => {
  const result: string[] = [];
  const levelNames = Object.keys(levels);
  levelNames.forEach((levelName) => {
    Object.keys(levels[levelName]).forEach((itemId) => {
      result.push(levelName + ":" + itemId);
    });
  });
  return result;
};

const createUserAuthInDestination = async (
  userData: WebUserSchema,
  sourceDBApp: admin.app.App,
  destDBApp: admin.app.App
) => {
  const userId = userData._id ? userData._id : "";
  const userEmail = userData.personali.email ? userData.personali.email : "";

  console.log(
    `Check for user with Id ${userId} and email ${userEmail} in the ${destDBApp.name}`
  );

  if (userId === "" || userId === undefined) return;

  try {
    const existingUser = await destDBApp.auth().getUserByEmail(userEmail);
    console.log(
      `User exists and it's uid in ${destDBApp.name} env is ${existingUser.uid}`
    );
    if (existingUser.uid === userId || existingUser.email === userEmail) {
      console.log(
        `User already exists in the ${destDBApp.name}, skipping user creation step.`
      );
      return;
    }
  } catch (error) {
    try {
      const userFromSource = await sourceDBApp.auth().getUser(userId);
      console.log(
        `User doesn't exist in destination, grabbing data from ${
          sourceDBApp.appCheck().app.name
        } and its uid is ${userFromSource.uid}`
      );

      let passwordHashSetup: dPasswordHash;
      const projectId = sourceDBApp.options.projectId!;
      try {
        passwordHashSetup = setup[projectId];
        if (Object.keys(passwordHashSetup).length === 0) {
          console.error(
            `Password Hash Setup does not exist for hierarchy ${projectId}. Reach out to DEV Team!`
          );
          return;
        }
      } catch (err) {
        console.error(
          `Password Hash Setup does not exist for hierarchy ${projectId}. Reach out to DEV Team!`
        );
        return;
      }
      const userPasswordData = await getUserPasswordHash(userId, sourceDBApp);

      const userImportRecords = [
        {
          uid: userFromSource.uid,
          email: userFromSource.email,
          // Must be provided in a byte buffer.
          passwordHash: Buffer.from(userPasswordData.passwordHash, "base64"),
          // Must be provided in a byte buffer.
          passwordSalt: Buffer.from(userPasswordData.passwordSalt, "base64"),
        },
      ];

      await destDBApp.auth().importUsers(userImportRecords, {
        hash: {
          algorithm: "SCRYPT",
          // All the parameters below can be obtained from the Firebase Console's users section.
          // Must be provided in a byte buffer.
          key: Buffer.from(passwordHashSetup.base64_signer_key, "base64"),
          saltSeparator: Buffer.from(
            passwordHashSetup.base64_salt_separator,
            "base64"
          ),
          rounds: 8,
          memoryCost: 14,
        },
      });
    } catch (err) {
      console.error("Error while Creating User Authentication Information!!");
    }
  }
};

const getUserPasswordHash = async (
  uid: string,
  sourceDBApp: admin.app.App,
  nextPageToken?: any
) => {
  // List batch of users, 1000 at a time.
  const passwordData = {} as dUserPWDData;
  const listUsersResult = await sourceDBApp
    .auth()
    .listUsers(1000, nextPageToken);

  const foundUser = listUsersResult.users.find((x) => x.uid === uid);
  //foundUser?.metadata.
  if (foundUser) {
    passwordData.uid = foundUser.uid;
    passwordData.passwordHash = foundUser.passwordHash
      ? foundUser.passwordHash
      : "";
    passwordData.passwordSalt = foundUser.passwordSalt
      ? foundUser.passwordSalt
      : "";
  }
  if (passwordData.passwordHash === "" && listUsersResult.pageToken) {
    // List next batch of users.
    await getUserPasswordHash(uid, sourceDBApp, listUsersResult.pageToken);
  }

  return passwordData;
};

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
        tempData.displayName =
          contact.givenName + " " + contact.familyName
            ? contact.givenName + " " + contact.familyName
            : "";
        tempData.phoneNumbers = tempData.phoneNumbers
          ? tempData.phoneNumbers
          : [];
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

const getPageIdFromName = async (sourceApp: admin.app.App, topage: string) => {
  const sourceDB = sourceApp.firestore();
  if (topage) {
    let ref;
    try {
      ref = await sourceDB
        .collection(MOBFPATH.PAGES)
        .where("name", "==", topage)
        .get();
    } catch (err) {
      console.log(
        `Error while finding topage with name ${topage} for mobile -> Web Data Sync`
      );
    }
    //NOTE If multiple pages with same name then grab the first one.
    const mobPageId = ref?.docs[0].id;
    topage = mobPageId ? "page:" + mobPageId : "";
    console.log("mappedData.topage for the web is :>> ", topage);
  }

  return topage;
};
