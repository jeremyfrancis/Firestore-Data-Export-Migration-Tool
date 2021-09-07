import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import fetch from "node-fetch";
import { APIROUTE, iCollection, iDBList } from "./migrationData";

interface migrationSchema {
  selectedDBList: iDBList[];
  selectedColls: iCollection[];
  mapUserSchema: boolean;
  mapScoreboardSchema: boolean;
  clone: boolean;
  destinationDBSAFile: File;
}

export const handleStartMigration = async (state: migrationSchema) => {
  const {
    selectedDBList: dbList,
    selectedColls: collList,
    mapUserSchema,
    mapScoreboardSchema,
    clone,
    destinationDBSAFile: destDBSAFile,
  } = state;
  if (dbList.length === 0) return;

  console.log("Beginning migration");

  const destDBSAFileData = await destDBSAFile.text();

  const payload = {
    dbNameList: dbList,
    collList,
    mapUserSchema,
    mapScoreboardSchema,
    clone,
    destDBSAFile: destDBSAFileData,
  };

  await fetch(APIROUTE.MIGRATION, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer token",
    },
  }).then(async (res: any) => {
    const statusText = await res.text();
    alert("Status is " + res.status + " and status text :" + statusText);
  });
};

const initFB = (db: iDBList) => {
  try {
    const config = JSON.parse(
      JSON.stringify(
        require(`../../../src/service-accounts-creds/${db.projectId!}`)
      )
    );

    let app: firebase.app.App = {} as firebase.app.App;

    const appID = db.projectId?.replace("-service-account.json", "");

    firebase.apps.forEach((appInfo) => {
      if (appInfo?.name === `${appID}`) {
        // console.log(
        //   "App is already available: ",
        //   JSON.stringify(appInfo?.name)
        // );
        app = appInfo;
      }
    });

    if (app.name !== undefined) {
      const fs = app.firestore();
      const au = app.auth();
      return { fs, au };
    } else {
      //console.log("Initializing the app for teamID: ", appID);
      app = firebase.initializeApp(
        {
          apiKey: config.private_key,
          appId: config.client_id,
          projectId: config.project_id,
        },
        appID
      );
    }

    const fs = app.firestore();
    const au = app.auth();
    return { fs, au };
  } catch (e) {
    console.log(
      "The service account file for " +
        db.projectId?.replace("-service-account.json", "") +
        " has issues. Please Check!!"
    );
    return undefined;
  }
};

export const handleTestConnection = (dbList: iDBList[]) => {
  if (dbList.length === 0) return;
  console.log("Testing Connection(s)");

  for (let i = 0; i < dbList.length; i++) {
    if (initFB(dbList[i])) {
      dbList[i].connectionSuccess = "Yes";
    } else {
      dbList[i].connectionSuccess = "No";
    }
  }

  return dbList;
};
