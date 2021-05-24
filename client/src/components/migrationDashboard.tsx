import React, { Component } from "react";
import {
  handleStartMigration,
  handleTestConnection,
} from "../services/migration";
import { getProdDBList, iDBList } from "../services/migrationData";
import FileUploader from "./fileUploader";

class MigrationDashboard extends Component<any, any> {
  state = {
    dbList: getProdDBList(),
    selectedDBList: [] as iDBList[],
    destinationDBSAFile: {} as File,
    buttonText: "Select All",
    fileSelected: "Destination Project-ID",
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

  render() {
    return (
      <main className="container text-center">
        <p
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: "bold",
            color: "#00e096",
            width: "100%",
            height: "10%",
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
          }}
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
                    className="btn btn-secondary btn-sm"
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

                <button
                  onClick={() => {
                    if (
                      this.state.selectedDBList.length === 0 ||
                      !this.state.destinationDBSAFile.name
                    ) {
                      alert(
                        "Please select at least one item from the Source DB list & also choose a .json file before starting migration."
                      );
                    } else {
                      handleStartMigration(
                        this.state.selectedDBList,
                        this.state.destinationDBSAFile
                      );
                    }
                  }}
                  className="btn btn-primary"
                >
                  Start Migration
                </button>
                <button
                  type="button"
                  className="btn btn-warning m-2"
                  onClick={() => {
                    const dbList = handleTestConnection(this.state.dbList);
                    this.setState({ dbList });
                  }}
                >
                  Test Connection(s)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </main>
    );
  }
}

export default MigrationDashboard;
