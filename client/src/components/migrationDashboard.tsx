import React, { Component } from "react";
import {
  handleStartMigration,
  handleTestConnection,
} from "../services/migration";
import {
  getCollectionsList,
  getProdDBList,
  iCollection,
  iDBList,
} from "../services/migrationData";
import FileUploader from "./fileUploader";

class MigrationDashboard extends Component<any, any> {
  state = {
    dbList: getProdDBList(),
    selectedDBList: [] as iDBList[],
    selectedColls: [] as iCollection[],
    destinationDBSAFile: {} as File,
    buttonText: "Select All",
    fileSelected: "Destination Project-ID",
    collections: getCollectionsList(),
    mapUserSchema: false,
  };

  handleSelectAll = () => {
    for (let i = 1; i <= this.state.dbList.length; i++) {
      this.state.buttonText === "Select All"
        ? this.handleCBSelect(this.state.dbList[i - 1])
        : this.setState({ selectedDBList: [] });
      (document.getElementById(`btncheck-${i}`)! as HTMLInputElement).checked =
        this.state.buttonText === "Select All" ? true : false;
    }

    if (this.state.buttonText !== "Unselect All") {
      this.setState({ buttonText: "Unselect All" });
    } else {
      this.setState({ buttonText: "Select All" });
    }
  };

  handleCollSelectAll = () => {
    console.log("Collections length ", this.state.collections.length);
    for (let i = 2; i <= this.state.collections.length; i++) {
      (document.getElementById(`chk-${i - 1}`)! as HTMLInputElement).checked =
        !(document.getElementById(`chk-${i - 1}`)! as HTMLInputElement).checked;

      (document.getElementById(`chk-${i - 1}`)! as HTMLInputElement).checked
        ? this.handleCollSelect(this.state.collections[i - 1])
        : (this.state.selectedColls = []);
    }
    console.log("Select collection ", this.state.selectedColls);
  };

  handleCBSelect = (db: iDBList) => {
    let selectedDBList = this.state.selectedDBList;

    if (selectedDBList.length === 0) {
      this.state.selectedDBList.push(db);
    } else if (selectedDBList.find((x) => x.id === db.id)) {
      let selectedDBList = this.state.selectedDBList.filter(
        (x) => x.id !== db.id
      );
      this.setState(() => {
        return { selectedDBList };
      });
    } else {
      this.state.selectedDBList.push(db);
    }

    if (this.state.selectedDBList.length > 0) {
      this.setState(() => {
        return { buttonText: "Unselect All" };
      });
    } else {
      this.setState(() => {
        return { buttonText: "Select All" };
      });
    }
  };

  handleCollSelect = (collection: iCollection) => {
    console.log("Collection is ", JSON.stringify(collection));
    if (collection.id === 0) {
      this.handleCollSelectAll();
      return;
    }
    this.state.selectedColls.push(collection);
  };

  render() {
    return (
      <main className="container text-center">
        <p
          style={styles.header}
          className="text-center .align-middle bg-dark mt-3"
        >
          🚀 Migration Tool 🚀
        </p>
        <table className="table .table-borderless vertical-align-center">
          <thead>
            <tr>
              <th style={{ fontSize: 40 }}>
                Source Database(s)
                <div>
                  <button
                    onClick={this.handleSelectAll}
                    className="btn btn-secondary btn-sm"
                    id="btn-selAll"
                  >
                    {this.state.buttonText}
                  </button>
                </div>
              </th>
              <th />
              <th style={{ fontSize: 40 }}>
                Destination Database
                <div>🗄</div>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontSize: 40 }}>
                <ol className="list-group" id="dbList">
                  {this.state.dbList.sort().map((db) => (
                    <li key={db.id!} style={{ fontSize: 20 }}>
                      <input
                        type="checkbox"
                        className="btn-check"
                        id={"btncheck-" + db.id!}
                        autoComplete="off"
                        disabled={db.connectionSuccess === "No" ? true : false}
                        onClick={() => {
                          this.handleCBSelect(this.state.dbList[db.id! - 1]);
                        }}
                      />
                      <label
                        style={{
                          width: "80%",
                          height: 45,
                          marginBottom: 10,
                          fontSize: 15,
                        }}
                        id={"label-" + db.id!}
                        className={
                          db.connectionSuccess === ""
                            ? "btn btn-lg btn-outline-primary text-truncate col-2"
                            : db.connectionSuccess === "No"
                            ? "btn btn-lg btn-danger text-truncate col-2"
                            : "btn btn-lg btn-outline-primary text-truncate col-2"
                        }
                        htmlFor={"btncheck-" + db.id!}
                      >
                        {db
                          .projectId!.replace("-service-account.json", "")
                          .replace("-apptakeoff", "")
                          .replace(/\w+/g, function (w) {
                            return (
                              w[0].toUpperCase() + w.slice(1).toLowerCase()
                            );
                          })}
                      </label>
                      {db.connectionSuccess === "Yes" ? (
                        <span className="badge ">✅</span>
                      ) : db.connectionSuccess !== "" ? (
                        <span className="badge ">❌</span>
                      ) : (
                        <span className="badge "></span>
                      )}
                    </li>
                  ))}
                </ol>
              </td>
              <td />
              <td style={{ fontSize: 40 }}>
                <div className="input-group mb-3">
                  <span className="input-group-text" id="basic-addon1">
                    📂
                  </span>
                  <FileUploader
                    className="btn btn-primary btn-sm"
                    handleFile={async (item: File) =>
                      this.setState({
                        destinationDBSAFile: item,
                        fileSelected: JSON.parse(await item.text()).project_id,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="form-control form-floating"
                    placeholder={this.state.fileSelected}
                    aria-label="Destination Project-id"
                    aria-describedby="basic-addon1"
                    disabled
                  />
                </div>
                <tr>
                  <td>
                    {this.state.collections.map((collection) => (
                      <div className="input-group form-check-inline mb-2">
                        <div
                          className="input-group-text"
                          style={
                            collection.id === 0
                              ? { backgroundColor: "#FFC107" }
                              : {}
                          }
                        >
                          <input
                            className="form-check-input mt-0"
                            type="checkbox"
                            style={
                              collection.id === 0 ? { color: "white" } : {}
                            }
                            value=""
                            id={"chk-" + collection.id}
                            aria-label="Checkbox for following text input"
                            onChange={() => {
                              this.handleCollSelect(collection);
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          style={
                            collection.id === 0
                              ? {
                                  color: "black",
                                  backgroundColor: "#FFC107",
                                }
                              : {}
                          }
                          className="form-control"
                          aria-label="Text input with checkbox"
                          value={collection.collectionName}
                          disabled
                        />
                      </div>
                    ))}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        if (
                          this.state.selectedDBList.length === 0 ||
                          this.state.selectedColls.length === 0 ||
                          !this.state.destinationDBSAFile.name
                        ) {
                          alert(
                            "One of the below items is missing \n 1.Select Source DB(s) \n 2.Choose a .json file \n 3.Select a collection to migrate"
                          );
                        } else {
                          handleStartMigration(
                            this.state.selectedDBList,
                            this.state.selectedColls,
                            this.state.mapUserSchema,
                            this.state.destinationDBSAFile
                          );
                        }
                      }}
                      className="btn btn-primary ms-2"
                    >
                      Start Migration
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning ms-2"
                      onClick={() => {
                        const dbList = handleTestConnection(this.state.dbList);
                        this.setState({ dbList });
                      }}
                    >
                      Test Connection(s)
                    </button>

                    <div className="form-check form-switch form-control-lg ms-2 border border-secondary">
                      <input
                        className="form-check-input m-1"
                        type="checkbox"
                        id="mapUserSchema"
                        checked={this.state.mapUserSchema}
                        onChange={() => {
                          this.setState({
                            mapUserSchema: !this.state.mapUserSchema,
                          });
                        }}
                      />
                      <label
                        className="form-check-label ms-1"
                        htmlFor="flexSwitchCheckDefault"
                      >
                        Map User Schema to Web
                      </label>
                    </div>
                  </td>
                </tr>
              </td>
            </tr>
          </tbody>
        </table>
      </main>
    );
  }
}

interface StyleSheet {
  [key: string]: React.CSSProperties;
}

const styles: StyleSheet = {
  header: {
    display: "flex",
    fontSize: 40,
    fontWeight: "bold",
    color: "#00e096",
    width: "100%",
    height: "10%",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
};
export default MigrationDashboard;
