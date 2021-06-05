import express from "express";
import bodyParser from "express";
import * as admin from "firebase-admin";

import {
  FRBS_ROLE,
  iCollection,
  iDBList,
  MobileUserSchema,
  THEME,
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
    destDBSAFile,
  }: {
    dbNameList: iDBList[];
    collList: iCollection[];
    mapUserSchema: boolean;
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
      console.log("Total Collections " + JSON.stringify(collNames));

      const sourceFS = sourceDBApp.firestore();
      collNames.forEach((coll) => {
        // console.log(
        //   "Starting data move for " + dbName + " and collection " + coll
        // );
        sourceFS
          .collection(coll)
          .limit(8)
          .where("email", "==", "mankar.saurabh@gmail.com")
          .get()
          .then((collDocSnap) => {
            collDocSnap.docs.forEach(async (collDoc) => {
              let outCollData: any;

              console.log("Map User Schema is ", mapUserSchema);

              if (coll === "users" && mapUserSchema) {
                console.log("Mapping data for ", collDoc.data().email);

                outCollData = {
                  ...mapUserSchemaToWeb(collDoc),
                  _teamId: sourceProjectId,
                };
              } else {
                outCollData = {
                  ...collDoc.data(),
                  _teamId: sourceProjectId,
                };
              }

              //console.log("OutCollData is ", JSON.stringify(outCollData));

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
                  tempCollDocId = collDoc.id + "-" + sourceProjectId;
                  break;
                case "notifications":
                  tempCollDocId = collDoc.id + "-" + sourceProjectId;
                  break;
                case "scoreboard":
                  tempCollDocId = collDoc.id + "-" + sourceProjectId;
                  break;
                case "zoom":
                  tempCollDocId = collDoc.id + "-" + sourceProjectId;
                  break;
                case "channels":
                  tempCollDocId = collDoc.id + "-" + sourceProjectId;
                  break;
                default:
                  tempCollDocId = collDoc.id;
                  break;
              }

              // console.log(
              //   "Collection is " + coll + " and doc id is " + tempCollDocId
              // );
              // console.log("outCollData saved is ", JSON.stringify(outCollData));

              await destFS
                ?.collection(coll)
                .doc(tempCollDocId)
                .set(outCollData);

              //NOTE: Step-2: Then Copy all subcollection documents of the root Collection Document.
              sourceFS
                .collection(coll)
                .doc(collDoc.id)
                .listCollections()
                .then((subCollections) => {
                  subCollections.forEach((subCollection) => {
                    subCollection.get().then((subCollData) => {
                      subCollData.docs.forEach(async (subCollDoc) => {
                        // console.log(
                        //   "CollId is " +
                        //     collDoc.id +
                        //     " temp coll is " +
                        //     tempCollDocId
                        // );

                        await destFS
                          ?.collection(coll)
                          .doc(tempCollDocId)
                          .collection(subCollection.id)
                          .doc(subCollDoc.id)
                          .set(subCollDoc.data(), { merge: true });
                      });
                    });
                  });
                });

              if (coll === "users" && mapUserSchema) {
                console.log("Making UID Updates");
                updateUsersUID(outCollData, sourceDBApp, destDBApp).then(() => {
                  console.log("Completed UID Update");
                });
              }
            });
          });
      });
      //#endregion
    } else {
      console.log("Error with App Initialization for");
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
          output.push(coll.id);
      });
      return output;
    });

  return output;
}

function mapUserSchemaToWeb(
  collDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
) {
  let mobileUser = <MobileUserSchema>collDoc.data();
  let webUser = <WebUserSchema>{
    theme: THEME.LIGHT,
    _id: collDoc.id,
    personali: {
      displayName: mobileUser.name,
      email: mobileUser.email,
      phoneNumber: mobileUser.phoneNumber,
      photoURL: mobileUser.profileImage,
    },
    roles: [mobileUser.admin ? FRBS_ROLE.ADMIN : FRBS_ROLE.NEWBIE],
    growth: {
      allLevelsCompleted: mobileUser.allLevelsCompleted,
      levels: mobileUser.levels,
      listBuilder: {
        lists: mobileUser.listBuilder?.lists,
        shareTo: mobileUser.listBuilder?.shareTo,
      },
      team: collDoc.data().team,
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

  webUser = { ...webUser, ...mobileUser };
  console.log(webUser);
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
  console.log("Email is ", email);

  if (email === "" || email === undefined) return;

  console.log("Inside updateUsersUID");
  let newUserOverrides = {
    uid: outCollData._id,
  };
  let oldUser: any;
  try {
    console.log("Starting update for user with email:", email);
    oldUser = await admin.auth().getUserByEmail(email!);
    //console.log("Old user found:", oldUser);

    if (oldUser.uid === outCollData._id) {
      console.log(
        "User " +
          email +
          " already exists in the destination DB with UID " +
          outCollData._id
      );
      return;
    }
    await admin.auth().deleteUser(oldUser.uid);
    console.log("Old user deleted.");
  } catch (e) {
    console.log("User not found in destination DB ", email);
    console.log("Copying the user data from source DB");
    oldUser = await sourceDBApp?.auth().getUserByEmail(email);
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
  //console.log("New user data ready: ", newUserData);

  let newUser = await admin.auth().createUser(newUserData);
  console.log("New user created ");
}
