import { default as bodyParser, default as express } from "express";
import * as admin from "firebase-admin";
import { firestore } from "firebase-admin";
import {
  ContactGroupSchema,
  dContactSuggestion,
  dMobMediaPageItem,
  dMoreItem,
  dPasswordHash,
  dUserPWDData,
  FRBS_ROLE,
  iCollection,
  iDBList,
  iServiceAccount,
  MOBFPATH,
  MobileScoreboardSchema,
  MobileUserSchema,
  MobMediaPageSchema,
  MobPosstSchema,
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

let authUsersDeletedCount: number = 0;

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

router.post("/updateSubDomain", async (req, res) => {
  const {
    subdomain,
    selectedDB,
    destDBSAFile,
  }: {
    subdomain: string;
    selectedDB: iDBList;
    destDBSAFile: any;
  } = req.body;

  const sourceProjectId = selectedDB.projectId!.replace(
    "-service-account.json",
    ""
  );
  let destDBApp: admin.app.App | undefined;
  if (typeof destDBSAFile === "object") {
    const destDBSAFileObj: iServiceAccount = <iServiceAccount>destDBSAFile;
    destDBApp = initApp(
      destDBSAFileObj.project_id,
      "destination",
      destDBSAFile
    );
  } else {
    //#region This is Destination DB Area
    destDBApp = initApp(
      JSON.parse(destDBSAFile).project_id,
      "destination",
      destDBSAFile
    );
  }

  if (!destDBApp) {
    res.status(444);
    res.send("Invalid Destination File Data Sent over.");
    return;
  }

  if (subdomain && sourceProjectId) {
    const destDB = destDBApp.firestore();
    try {
      await destDB
        .collection(WEBFPATH.CONFIG)
        .doc("variables-" + sourceProjectId)
        .update({ subdomain: subdomain });

      res.status(200);
      res.send(
        `✅ Successfully updated the subdomain for ${sourceProjectId} wiht value ${subdomain}`
      );
    } catch (e) {
      res.status(444);
      res.send("Error while updating the subdomain");
    }
  } else {
    res.status(444);
    res.send("Error while updating subdomain value. Please check your input");
  }
});

router.post("/clearAuth", async (req, res) => {
  const {
    deleteAuthRecords,
    destDBSAFile,
  }: {
    deleteAuthRecords: boolean;
    destDBSAFile: any;
  } = req.body;

  //#region This is Destination DB Area
  const destDBApp = initApp(
    JSON.parse(destDBSAFile).project_id,
    "destination",
    destDBSAFile
  );

  if (deleteAuthRecords && destDBApp) {
    await cleanUpDestinationAuthUsers(destDBApp);
    res.send(
      `Auth Deletion successful for ${destDBApp.name} and ${authUsersDeletedCount} user(s) were deleted`
    );
    return;
  }
});

router.post("/fixMobileData", async (req, res) => {
  const {
    fixMobileData,
    selectedDBList,
  }: {
    fixMobileData: boolean;
    selectedDBList: iDBList[];
  } = req.body;

  console.log(`fixMobileData is ${fixMobileData}`);
  //console.log(req.body);
  //#region This is Destination DB Area
  if (!fixMobileData) {
    res.status(444);
    res.send("BAD CHOICE BOY!!");
    return;
  }
  const sourceProjectId = selectedDBList[0].projectId!.replace(
    "-service-account.json",
    ""
  );

  if (selectedDBList.length > 1) {
    res.status(444);
    res.send("Cannot process more than 1 DB at a time!!");
    return;
  }

  //NOTE Do not run this if running for MillerTime
  if (!sourceProjectId.indexOf("millertime")) {
    res.status(448);
    res.send(
      `Cannot run this process on Master Yoda, I mean MillerTime's app 😉`
    );
    return;
  }

  try {
    const sourceDBApp = initApp(sourceProjectId, "source");
    const sourceDB = sourceDBApp?.firestore();

    const cloneApp = initApp("clone-apptakeoff", "source");
    const cloneDB = cloneApp?.firestore();

    const priPreloadedApp = initApp("preloaded-primerica-content", "source");
    const priPreloadedDB = priPreloadedApp?.firestore();

    const millertTimeApp = initApp("millertime-apptakeoff", "source");
    const millerTimeDB = millertTimeApp?.firestore();

    if (fixMobileData && sourceDB && priPreloadedDB && millerTimeDB) {
      //!STEP 1: Get the copy of all the document ids from Primerica Preloaded Content & Miller Time
      const priPreloadedAndMTPageIds: string[] = [];
      const pageRefPri = await priPreloadedDB.collection(MOBFPATH.PAGES).get();
      if (pageRefPri) {
        pageRefPri.docs.forEach((doc) => {
          priPreloadedAndMTPageIds.push(doc.id);
        });
      }

      const pageRefMT = await millerTimeDB?.collection(MOBFPATH.PAGES).get();
      if (pageRefMT) {
        pageRefMT.docs.forEach((doc) => {
          priPreloadedAndMTPageIds.push(doc.id);
        });
      }

      const pageRefClone = await cloneDB?.collection(MOBFPATH.PAGES).get();
      if (pageRefClone) {
        pageRefClone.docs.forEach((doc) => {
          priPreloadedAndMTPageIds.push(doc.id);
        });
      }
      //! STEP 1.1: Get Copy of all the "more" ids from Primerica Preloaded Content
      const priPreloadedAndMTMoreIds: string[] = [];
      const moreRefPri = await priPreloadedDB.collection(MOBFPATH.MORE).get();
      const moreRefMT = await millerTimeDB.collection(MOBFPATH.MORE).get();
      if (moreRefPri) {
        moreRefPri.docs.forEach((doc) => {
          priPreloadedAndMTMoreIds.push(doc.id);
        });
      }
      if (moreRefMT) {
        moreRefMT.docs.forEach((doc) => {
          priPreloadedAndMTMoreIds.push(doc.id);
        });
      }

      // console.log(
      //   `Checking against ${
      //     priPreloadedAndMTPageIds.length
      //   } priPreloadedAndMTPageIds and they are ${JSON.stringify(
      //     priPreloadedAndMTPageIds
      //   )}`
      // );

      const posstRef = sourceDB.collection(MOBFPATH.POSSTS);

      //!STEP 1.2 : Compare the moreIds for the selected DB with ids from STEP 1.1
      const moreRef = await sourceDB.collection(MOBFPATH.MORE).get();
      moreRef?.docs.forEach(async (oldMoreDoc) => {
        if (priPreloadedAndMTMoreIds.includes(oldMoreDoc.id)) {
          const newMoreRef = sourceDB?.collection(MOBFPATH.MORE).doc();
          if (newMoreRef) {
            const newMoreData = <dMoreItem>{ ...oldMoreDoc.data() };
            // console.log(
            //   `Old "MORE" Id ${oldMoreDoc.id} and its new "more" id will be ${newMoreRef.id}`
            // );
            await sourceDB
              .collection(MOBFPATH.MORE)
              .doc(newMoreRef.id)
              .set(newMoreData);

            await sourceDB
              .collection(MOBFPATH.MORE)
              .doc(oldMoreDoc.id)
              .delete();
          }
        }
      });
      //!STEP 2: Compare the pageIds for the selected DB with ids from Step 1.
      //*If the pageId exists then create a copy of that page with new ID but keep
      //*the pageContentId the same.
      const srcAppPagesRef = await sourceDB.collection(MOBFPATH.PAGES).get();
      srcAppPagesRef?.docs.forEach(async (srcPage) => {
        //! TESTING ONLY FOR 1 PAGE FIRST
        //console.log(`The pageId inside the app is ${srcPage.id}`);
        if (priPreloadedAndMTPageIds.includes(srcPage.id)) {
          // console.log("PAGE IDS MATCHED!!!");
          const newPageDocRef = sourceDB?.collection(MOBFPATH.PAGES).doc();
          if (newPageDocRef) {
            const newPageData = <MobMediaPageSchema>{
              ...srcPage.data(),
              teamID: sourceProjectId,
              id: newPageDocRef.id,
            };

            // console.log(
            //   `Old Page Id ${
            //     srcPage.id //+ ":" + srcPage.data().name
            //   } and its new id will be ${newPageData.id}` //+ ":" + newPageData.name
            // );
            await sourceDB
              .collection(MOBFPATH.PAGES)
              .doc(newPageDocRef.id)
              .set(newPageData);

            const oldPageContentRef = await sourceDB
              .collection(MOBFPATH.PAGES)
              .doc(srcPage.id)
              .collection(MOBFPATH.CUSTOM_PAGE_CONTENT)
              .get();

            oldPageContentRef.docs.forEach(async (pageContent) => {
              const oldPageContentData = pageContent.data();
              await sourceDB
                .collection(MOBFPATH.PAGES)
                .doc(newPageData.id)
                .collection(MOBFPATH.CUSTOM_PAGE_CONTENT)
                .doc(pageContent.id)
                .set(oldPageContentData);

              //! Delete the pageContent contents of old duplicate page
              await sourceDB
                .collection(MOBFPATH.PAGES)
                .doc(srcPage.id)
                .collection(MOBFPATH.CUSTOM_PAGE_CONTENT)
                .doc(pageContent.id)
                .delete();
            });

            //!STEP 3: For each newly created Page, save the new id and old id for updating the references
            //!STEP 4: Update the reference in possts
            const posstDocRef = await posstRef
              .where("goToPage", "==", srcPage.id)
              .get();
            posstDocRef.docs.forEach((posst) => {
              const posstData = <MobPosstSchema>{
                ...posst.data(),
                goToPage: newPageData.id,
              };
              // console.log(
              //   `Posst that will be affected by this is ${posst.id} and new goToPage will be ${newPageData.id}`
              // );
              posstRef.doc(posst.id).set(posstData, { merge: true });
            });

            //!Step 5: Delete the old Page Document
            await sourceDB.collection(MOBFPATH.PAGES).doc(srcPage.id).delete();
          }
        } else {
          // console.log(
          //   `PageId ${srcPage.id} doesn't exist in Preloaded Content or Miller Time`
          // );
        }
      });

      res.send(`Pages Data & More cleaned up for the app ${sourceDBApp?.name}`);

      return;
    } else {
      res.status(444);
      res.send(
        `Error while cleaning up duplicate pages for ${sourceDBApp?.name}`
      );
      return;
    }
  } catch (err) {
    res.status(445);
    res.send("=====Error in fixMobileData App, Couldn't initialize app!!=====");
    return;
  }
});

router.post("/migration", async (req, res) => {
  const {
    dbNameList,
    collList,
    mapUserSchema,
    mapScoreboardSchema,
    clone,
    testing,
    deleteAuthRecords,
    destDBSAFile,
  }: {
    dbNameList: iDBList[];
    collList: iCollection[];
    mapUserSchema: boolean;
    mapScoreboardSchema: boolean;
    clone: boolean;
    testing: boolean;
    deleteAuthRecords: boolean;
    destDBSAFile: any;
  } = req.body;

  let destDBApp: admin.app.App | undefined;
  if (typeof destDBSAFile === "object") {
    const destDBSAFileObj: iServiceAccount = <iServiceAccount>destDBSAFile;
    destDBApp = initApp(
      destDBSAFileObj.project_id,
      "destination",
      destDBSAFile
    );
  } else {
    //#region This is Destination DB Area
    destDBApp = initApp(
      JSON.parse(destDBSAFile).project_id,
      "destination",
      destDBSAFile
    );
  }

  if (deleteAuthRecords && destDBApp) {
    await cleanUpDestinationAuthUsers(destDBApp);
    console.log(
      `Auth Deletion successful for ${destDBApp.name} and ${authUsersDeletedCount} user(s) were deleted`
    );
    return;
  }
  const destFS = destDBApp?.firestore();
  //#endregion

  //#region This is Source DB(s) area
  dbNameList.forEach(async (sourceDB) => {
    const test = sourceDB.projectId!.replace("-service-account.json", "");
    const sourceProjectId =
      test === "clone-primr-exp" ? "carreon-hierarchy-mb2" : test;

    const sourceDBApp = initApp(test, "source");

    if (sourceDBApp !== undefined) {
      const collNames: string[] = await getCollections(sourceDBApp, collList);
      //console.log("Total Collections " + JSON.stringify(collNames));

      const sourceFS = sourceDBApp.firestore();

      collNames.forEach((coll) => {
        let query = testing
          ? sourceFS.collection(coll).limit(10)
          : sourceFS.collection(coll);

        query.get().then((collDocSnap) => {
          collDocSnap.docs.forEach(async (collDoc) => {
            let outCollData: any;
            let tempProjectId = sourceProjectId;
            // console.log(
            //   "Starting data move for " +
            //     test +
            //     " and collection " +
            //     coll +
            //     " and id is " +
            //     collDoc.id
            // );

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
            if (coll === MOBFPATH.SCOREBOARDS && mapScoreboardSchema) {
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
              case "configs":
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

            let webCollName: string;
            switch (coll) {
              case MOBFPATH.CONFIG:
                webCollName = WEBFPATH.CONFIG;
                break;
              case MOBFPATH.USERS:
                webCollName = WEBFPATH.USERS;
                break;
              case MOBFPATH.SCOREBOARDS:
                webCollName = WEBFPATH.SCOREBOARDS;
                break;
              case MOBFPATH.MORE:
                webCollName = WEBFPATH.MORE;
                break;
              case MOBFPATH.PAGES:
                webCollName = WEBFPATH.PAGES;
                break;

              default:
                webCollName = coll;
                break;
            }

            if (
              tempCollDocId === "" &&
              webCollName === WEBFPATH.SCOREBOARDS &&
              newSBData
            ) {
              newSBData.forEach(async (scoreboard) => {
                await destFS
                  ?.collection(webCollName)
                  .add({
                    _teamId: collDoc.data()._teamId
                      ? collDoc.data()._teamId
                      : sourceProjectId,
                    ...scoreboard,
                  })
                  .then(async function (newSBID) {
                    await destFS
                      .collection(webCollName)
                      .doc(newSBID.id)
                      .update({
                        _sbid: newSBID.id.replace("/scoreboard/", ""),
                      });
                  });
              });
            } else {
              //NOTE:We are moving defaultLists to code instead of firestore
              if (tempCollDocId.includes("variable")) {
                outCollData.subdomain = "";
                outCollData.isDataSyncEnabled = false;
                delete outCollData.listBuilder;
              }

              if (webCollName === WEBFPATH.POSSTS) {
                if (outCollData.goToPage && outCollData.goToPage !== "") {
                  outCollData = {
                    ...outCollData,
                    goToPage: "page:" + outCollData.goToPage,
                    _teamId: collDoc.data()._teamId
                      ? collDoc.data()._teamId
                      : tempProjectId,
                    _pid: tempCollDocId,
                  };
                } else {
                  outCollData = {
                    ...outCollData,
                    _teamId: collDoc.data()._teamId
                      ? collDoc.data()._teamId
                      : tempProjectId,
                    _pid: tempCollDocId,
                  };
                }
              }

              if (webCollName === WEBFPATH.PAGES) {
                if (outCollData.mediaItem) {
                  outCollData.mediaItem.team =
                    outCollData.mediaItem.team === "false"
                      ? false
                      : outCollData.mediaItem.team === "true"
                      ? true
                      : outCollData.mediaItem.team;

                  outCollData.mediaItem.visible =
                    outCollData.mediaItem.visible === "false"
                      ? false
                      : outCollData.mediaItem.visible === "true"
                      ? true
                      : outCollData.mediaItem.visible;
                }
                if (outCollData.pageItem) {
                  outCollData.pageItem.visible =
                    outCollData.pageItem.visible === "false"
                      ? false
                      : outCollData.pageItem.visible === "true"
                      ? true
                      : outCollData.pageItem.visible;
                }
                if (outCollData.api) {
                  delete outCollData.api;
                }
              }
              if (
                webCollName === WEBFPATH.MORE ||
                webCollName === WEBFPATH.PAGES
              ) {
                outCollData = {
                  ...outCollData,
                  _teamId: collDoc.data()._teamId
                    ? collDoc.data()._teamId
                    : tempProjectId,
                  _id: tempCollDocId,
                };
              }

              if (webCollName === WEBFPATH.CONFIG) {
                tempCollDocId = !tempCollDocId.includes("-")
                  ? tempCollDocId + "-" + tempProjectId
                  : tempCollDocId;
                // console.log(tempCollDocId);
              }
              // console.log(
              //   `id before saving document ${webCollName} is ${tempCollDocId}`
              // );
              await destFS
                ?.collection(webCollName)
                .doc(tempCollDocId)
                .set(outCollData, { merge: true });

              //TODO For Web User, move the listBuilder from MobileUserSchema to a sub-collection called contact-groups and contacts in WebUser document.
              if (webCollName === WEBFPATH.USERS) {
                try {
                  let batchCount = 0;
                  const contactGroupDocs: ContactGroupSchema[] =
                    mapListBuilderToContactGroups(collDoc);
                  const listOfContacts: dContactSuggestion[] =
                    mapListBuilderToContacts(collDoc);

                  let destBatch = destDBApp?.firestore().batch();
                  contactGroupDocs.forEach((cgData) => {
                    // console.log("cgData", JSON.stringify(cgData));
                    // console.log(
                    //   `With cgData cgData._id is ${cgData._id} tempColl ${webCollName} is and tempCollDocId is ${tempCollDocId}`
                    // );
                    if (cgData._id && !cgData._id.includes("/")) {
                      const docRef = destFS
                        ?.collection(webCollName)
                        .doc(tempCollDocId)
                        .collection(WEBFPATH.CONTACT_GROUPS)
                        .doc(cgData._id);
                      if (docRef && cgData) {
                        batchCount += 1;
                        destBatch?.set(docRef, cgData, { merge: true });
                      }
                    }
                  });

                  listOfContacts.forEach(async (contactData) => {
                    // console.log("contactData", JSON.stringify(contactData));
                    // console.log(
                    //   `With contactData contactData._cid is ${contactData._cid} tempColl ${webCollName} is and tempCollDocId is ${tempCollDocId}`
                    // );
                    if (contactData._cid && !contactData._cid.includes("/")) {
                      const docRef = destFS
                        ?.collection(webCollName)
                        .doc(tempCollDocId)
                        .collection(WEBFPATH.CONTACTS)
                        .doc(contactData._cid);

                      if (docRef && contactData) {
                        if (batchCount < 500) {
                          batchCount += 1;
                          // console.log(
                          //   "CONTACT IS ",
                          //   JSON.stringify(contactData)
                          // );
                          destBatch?.set(docRef, contactData, { merge: true });
                        } else {
                          console.log(
                            `🔥 Batch reached 500!! Committing it now!!`
                          );
                          await destBatch?.commit();
                          console.log("⚠️ Resetting batch for writing!!");
                          destBatch = undefined;
                          destBatch = destDBApp?.firestore().batch();
                          batchCount = 0;
                        }
                      }
                    }
                  });
                  await destBatch?.commit();
                } catch (err) {
                  console.log(
                    "Error While mapping ListBuilder and Contacts",
                    err
                  );
                  throw new Error(
                    "Error While mapping ListBuilder and Contacts"
                  );
                }
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
                        if (subCollection.id === WEBFPATH.CUSTOM_PAGE_CONTENT) {
                          const tempPageContent = <dMobMediaPageItem>(
                            subCollDoc.data()
                          );
                          tempPageContent.topage = tempPageContent.topage
                            ? await getPageIdFromName(
                                sourceDBApp,
                                tempPageContent.topage
                              )
                            : "";
                          if (tempPageContent.media) {
                            tempPageContent.media =
                              tempPageContent.media == "0"
                                ? ""
                                : tempPageContent.media;
                          }
                          if (tempPageContent.paragraph) {
                            tempPageContent.paragraph =
                              tempPageContent.paragraph == "0"
                                ? ""
                                : tempPageContent.paragraph;
                          }
                          tempPageContent.url =
                            tempPageContent.topage &&
                            tempPageContent.topage?.includes("page:")
                              ? tempPageContent.topage
                              : tempPageContent.url
                              ? tempPageContent.url
                              : "";
                          if (tempPageContent.url) {
                            tempPageContent.url = tempPageContent.url.includes(
                              "ext:"
                            )
                              ? tempPageContent.url.replace("ext:", "")
                              : tempPageContent.url;
                          }
                          await destFS
                            ?.collection(webCollName)
                            .doc(tempCollDocId)
                            .collection(subCollection.id)
                            .doc(subCollDoc.id)
                            .set(
                              { ...tempPageContent, _id: subCollDoc.id },
                              { merge: true }
                            );
                        } else {
                          await destFS
                            ?.collection(webCollName)
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
      console.log(`Error while initializing the app for ${sourceProjectId}`);
      res.send("Error while initializing the app");
    }
  });
  res.status(200);
  res.send("Migration Operation Completed!");
});

/**
 *
 * @param projectId Project Id from Firebase for different Production projects.
 * @returns initialized app based upon the service-account.json file
 */
const initApp = (projectId: string, appType: string, fileData?: string) => {
  let serviceAccount;
  try {
    if (appType === "source") {
      const credFileName = `../src/service-accounts-creds/${projectId}-service-account.json`;
      serviceAccount = require(credFileName);
    } else {
      if (fileData) {
        if (typeof fileData !== "object") serviceAccount = JSON.parse(fileData);
        else {
          serviceAccount = fileData;
        }
      } else {
        console.log("Destination DB service account info not passed.");
      }
    }
  } catch (err) {
    console.log("service Account file not found!!!");
    return undefined;
  }

  let secondaryApp: admin.app.App = <admin.app.App>{};

  admin.apps.forEach((app) => {
    if (app?.name === `${projectId}`) {
      //console.log("App is already available: ", JSON.stringify(app?.name));
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
};

/**
 *
 * @param dbApp The initialized app for which we need to find all root collections
 * @returns Collections in firestore for the app that is passed.
 */
const getCollections = async (
  dbApp: admin.app.App,
  collList: iCollection[]
): Promise<string[]> => {
  const output = await dbApp
    .firestore()
    .listCollections()
    .then((collections) => {
      const output: string[] = [];
      collections.forEach((coll) => {
        if (collList.find((x) => x.collectionName === coll.id))
          //if (coll.id === MOBFPATH.POSSTS)
          output.push(coll.id);
      });
      return output;
    });

  return output;
};

const mapSBSchemaToWeb = (
  collDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
) => {
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
};

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

  const userBaseShopId =
    (mobileUser.team
      ? await getPageIdFromName(sourceDBApp, mobileUser.team.teamName)
      : ""
    )?.replace("page:", "") || "";
  const teamRole = mobileUser.team?.role ? mobileUser.team.role : "";
  //@ts-ignore
  if (userBaseShopId && teamRole) userRoles.push(FRBS_ROLE.BS + userBaseShopId);
  // console.log("userBaseShopId: ", userBaseShopId);
  // console.log("userRoles", userRoles);

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
    allLevelsCompleted: mobileUser.allLevelsCompleted
      ? mobileUser.allLevelsCompleted
      : false,
    lastSignIn: mobileUser.lastSignIn
      ? mobileUser.lastSignIn
      : firestore.FieldValue.serverTimestamp(),
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
  // console.log("data being returned for user", webUser);
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

  // console.log(
  //   `Check for user with Id ${userId} and email ${userEmail} in the ${destDBApp.name}`
  // );

  if (userId === "" || userId === undefined) return;

  try {
    const existingUser = await destDBApp.auth().getUserByEmail(userEmail);
    // console.log(
    //   `User exists and it's uid in ${destDBApp.name} env is ${existingUser.uid}`
    // );
    if (existingUser.uid === userId || existingUser.email === userEmail) {
      // console.log(
      //   `User already exists in the ${destDBApp.name}, skipping user creation step.`
      // );
      return;
    }
  } catch (error) {
    try {
      const userFromSource = await sourceDBApp.auth().getUser(userId);
      // console.log(
      //   `User doesn't exist in destination, grabbing data from ${sourceDBApp.name} and its email is ${userFromSource.email}`
      // );

      let passwordHashSetup: dPasswordHash;
      const projectId = sourceDBApp.name;
      try {
        // console.log("Project ID for HASH", projectId);
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

      //! CHECK THIS BEFORE MIGRATING

      if (Object.keys(userPasswordData).length === 0) {
        throw Error("Error locating user's pwd info, check code");
      }
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
      // if (userData.personali.email === "mankar.saurabh@gmail.com") {
      //   console.log(`Data for ${userData.personali.email}`);
      //   console.log(`userImportRecords ${JSON.stringify(userPasswordData)}`);
      // }
      setTimeout(async () => {
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
      }, 1000);
    } catch (err) {
      console.error(
        `Error while Creating User Authentication Information for ${userData.personali.email} !!`
      );
      try {
        await destDBApp
          .firestore()
          .collection(WEBFPATH.USERS)
          .doc(userData._id)
          .delete();
        // console.log(
        //   `Since Authentication wasn't created, deleting the user document for ${userData.personali.email} with uid ${userData._id}`
        // );
      } catch (err) {
        //console.log("User Document wasn't created. It's all good!!");
      }
    }
  }
};

const getUserPasswordHash = async (
  uid: string,
  sourceDBApp: admin.app.App,
  nextPageToken?: any,
  searchRoundNumber = 1
) => {
  // List batch of users, 1000 at a time.
  let passwordData = {} as dUserPWDData;
  const listUsersResult = await sourceDBApp
    .auth()
    .listUsers(1000, nextPageToken);

  // console.log(
  //   `🔥 Finding the user's pwd data in round# ${searchRoundNumber} for user ${uid}`
  // );
  const foundUser = listUsersResult.users.find((x) => x.uid === uid);
  //foundUser?.metadata.
  if (foundUser) {
    // console.log(
    //   `🔥 FOUND user's pwd data in round# ${searchRoundNumber} for user ${uid}`
    // );
    passwordData.uid = foundUser.uid;
    passwordData.passwordHash = foundUser.passwordHash
      ? foundUser.passwordHash
      : "";
    passwordData.passwordSalt = foundUser.passwordSalt
      ? foundUser.passwordSalt
      : "";
  } else {
    // console.log(
    //   `⚠️ Searching for next page and its token is ${listUsersResult.pageToken}`
    // );
    if (Object.keys(passwordData).length === 0 && listUsersResult.pageToken) {
      // List next batch of users.
      //console.log(`Going for round ${searchRoundNumber + 1} `);
      passwordData = await getUserPasswordHash(
        uid,
        sourceDBApp,
        listUsersResult.pageToken,
        searchRoundNumber + 1
      );
    }
  }

  // console.log(
  //   `🚀 Returning password data ${JSON.stringify(passwordData)} for uid ${uid}`
  // );

  return passwordData;
};

const mapListBuilderToContactGroups = (
  collDoc: firestore.QueryDocumentSnapshot<firestore.DocumentData>
): ContactGroupSchema[] => {
  const mobileData = <MobileUserSchema>collDoc.data();
  const results: ContactGroupSchema[] = [];
  const lists = mobileData.listBuilder?.lists
    ? mobileData.listBuilder?.lists
    : [];
  if (lists.length > 0) {
    lists.forEach((list) => {
      let tempData: ContactGroupSchema = <ContactGroupSchema>{};
      if (!list.id && !list.title) return;
      tempData._id = list.title === "Build My List" ? "BML" : list.id;
      tempData.groupType = "list";
      tempData.name = list.title;
      tempData.contacts = [];
      if (
        Array.isArray(list?.contacts) &&
        list?.contacts &&
        list?.contacts?.length > 0
      ) {
        list?.contacts.forEach((contact) => {
          if (contact.recordID) tempData.contacts.push(contact.recordID);
        });
      }

      tempData.shareTo = mobileData.listBuilder?.shareTo
        ? mobileData.listBuilder.shareTo
        : [];
      results.push(tempData);
    });
    //console.log("results in mapLB TO CG :>> ", JSON.stringify(results));
  }
  return results;
};

const mapListBuilderToContacts = (
  collDoc: firestore.QueryDocumentSnapshot<firestore.DocumentData>
): dContactSuggestion[] => {
  const mobileData = <MobileUserSchema>collDoc.data();
  const results: dContactSuggestion[] = [];
  const lists = mobileData.listBuilder?.lists
    ? mobileData.listBuilder?.lists
    : [];
  if (lists.length > 0) {
    lists.forEach((list) => {
      if (
        Array.isArray(list?.contacts) &&
        list?.contacts &&
        list?.contacts?.length > 0
      ) {
        list.contacts.forEach((contact) => {
          if (!contact.recordID) return;
          let tempData: dContactSuggestion = <dContactSuggestion>{};
          tempData._cid = contact.recordID;
          if (contact.givenName) tempData.displayName = contact.givenName + " ";
          if (contact.familyName) tempData.displayName += contact.familyName;
          if (!tempData.displayName) tempData.displayName = "Unknown";
          tempData.phoneNumbers = [];
          if (contact.phoneNumbers) {
            contact.phoneNumbers?.forEach((phoneNumber, index) => {
              tempData.phoneNumbers.push({
                ...phoneNumber,
                id: index.toString(),
              });
            });
          }
          if (contact.emailAddresses) {
            tempData.email =
              contact?.emailAddresses && contact?.emailAddresses.length > 0
                ? contact.emailAddresses[0].email
                : "";
          }
          tempData.profileImage = contact.hasThumbnail
            ? contact.thumbnailPath
            : "";
          // tempData._uid = "";
          // tempData.pointers = "";
          // tempData.points = [];
          tempData.listId = list.title === "Build My List" ? "BML" : list.id;
          tempData.lanePositionId = "0:0";
          results.push(tempData);
        });
      }
    });
  }
  // console.log(
  //   "results after extracting contacts :>> ",
  //   JSON.stringify(results)
  // );
  return results;
};

const getPageIdFromName = async (sourceApp: admin.app.App, topage: string) => {
  const sourceDB = sourceApp.firestore();
  if (topage) {
    // console.log("topage before check ", topage);
    if (topage.includes("page:")) {
      const newPageId = topage?.replace("page:", "");
      // console.log("beforepageId " + newPageId);
      const newPageRef = await sourceDB
        .collection(MOBFPATH.PAGES)
        .where("_id", "==", newPageId)
        .get();
      try {
        topage = "page:" + newPageRef.docs[0].id;
        return;
      } catch (err) {
        topage = "";
      }
      // console.log("Updated Page Id is " + topage);
    } else {
      // console.log("topage passed is ", topage);
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
      //ref && console.log("Test for page Ref", JSON.stringify(ref.docs[0]));
      if (ref && ref.docs.length > 0) {
        const mobPageId = ref ? ref.docs[0].id : "";
        topage = mobPageId ? "page:" + mobPageId : "";
        // console.log("mobPageId", mobPageId);
      } else {
        topage = "";
      }
    }

    // console.log(`mappedData.topage ${topage} for the web is :>> ${topage}`);
  }

  return topage;
};

const cleanUpDestinationAuthUsers = async (
  destDBApp: admin.app.App,
  nextPageToken?: any
) => {
  // List batch of users, 1000 at a time.
  const passwordData = {} as dUserPWDData;
  const listUsersResult = await destDBApp.auth().listUsers(1000, nextPageToken);

  const foundUser: string[] = [];
  listUsersResult.users.forEach((user) => {
    user.uid && foundUser.push(user.uid);
  });
  //foundUser?.metadata.
  if (foundUser.length > 0) {
    setTimeout(async () => {
      await destDBApp.auth().deleteUsers(foundUser);
    }, 5000);
  }
  if (listUsersResult.pageToken) {
    // List next batch of users.
    await cleanUpDestinationAuthUsers(destDBApp, listUsersResult.pageToken);
  }

  return passwordData;
};
