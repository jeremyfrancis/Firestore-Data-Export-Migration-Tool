import express from "express";
import bodyParser from "express";
import * as admin from "firebase-admin";
import { iDBList } from "./migrationSchema";

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
    destDBSAFile,
  }: { dbNameList: iDBList[]; destDBSAFile: any } = req.body;

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
      const collNames: string[] = await getCollections(sourceDBApp);
      //console.log("Total Collections " + collNames.length);

      const sourceFS = sourceDBApp.firestore();
      collNames.forEach((coll) => {
        // console.log(
        //   "Starting data move for " + dbName + " and collection " + coll
        // );
        sourceFS
          .collection(coll)
          .limit(3)
          .get()
          .then((collDocSnap) => {
            collDocSnap.docs.forEach(async (collDoc) => {
              const outCollData = {
                ...collDoc.data(),
                _teamId: sourceProjectId,
              };

              //NOTE: Copy Source Collection Document to same collection in Destination
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
              let tempCollDocId;
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
                default:
                  tempCollDocId = collDoc.id;
                  break;
              }

              await destFS
                ?.collection(coll)
                .doc(tempCollDocId)
                .set(outCollData, { merge: true });

              //NOTE: Step-2: Then Copy all subcollection documents of the root Collection Document.
              sourceFS
                .collection(coll)
                .doc(collDoc.id)
                .listCollections()
                .then((subCollections) => {
                  subCollections.forEach((subCollection) => {
                    subCollection.get().then((subCollData) => {
                      subCollData.docs.forEach(async (subCollDoc) => {
                        await destFS
                          ?.collection(coll)
                          .doc(collDoc.id)
                          .collection(subCollection.id)
                          .doc(subCollDoc.id)
                          .set(subCollDoc.data(), { merge: true });
                      });
                    });
                  });
                });
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
    console.log("Initializing the app for teamID: ", projectId);
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
async function getCollections(dbApp: admin.app.App): Promise<string[]> {
  const output = await dbApp
    .firestore()
    .listCollections()
    .then((collections) => {
      const output: string[] = [];
      collections.forEach((coll) => {
        //if (coll.id === "config")
        output.push(coll.id);
      });
      return output;
    });
  return output;
}
