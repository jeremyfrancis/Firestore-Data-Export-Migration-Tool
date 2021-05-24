<!-- 
███████╗██████╗ ███████╗███╗   ███╗████████╗
██╔════╝██╔══██╗██╔════╝████╗ ████║╚══██╔══╝
█████╗  ██║  ██║█████╗  ██╔████╔██║   ██║   
██╔══╝  ██║  ██║██╔══╝  ██║╚██╔╝██║   ██║   
██║     ██████╔╝███████╗██║ ╚═╝ ██║   ██║   
╚═╝     ╚═════╝ ╚══════╝╚═╝     ╚═╝   ╚═╝   
-->
# FDEMT (Firestore-Data-Export-Migration-Tool)
---
### This is a fullstack (React-NodeJs-Firestore) tool created to move your data from multiple firebase projects with same collection names to a single project with merged data.

### _Problem_ : I have a lot of separate firebase projects for one product/app. I wish there was a way to merge all those separate firestore collection data into one separate project?
#### Example: 
Project A:

```bash
Collection
    |-Users
    |    |-User Document 1
    |    |       |- sub collection document 1
    |    |       |- sub collection document 2
    |    |-User Document 2
    |-Emails
            |-Email Document 1
            |-Email Document 2
```   

Project B:

```bash
Collection
    |-Users
    |    |-User Document 3
    |    |-User Document 4
    |    |       |- sub collection document 1
    |    |       |- sub collection document 2
    |-Emails
            |-Email Document 3
            |-Email Document 4
```   

Project C: After using FDEMT this project's firestore collection will look like 

```bash
Collection
    |-Users
    |    |-User Document 1
    |    |       |- sub collection document 1
    |    |       |- sub collection document 2
    |    |-User Document 2
    |    |-User Document 3
    |    |-User Document 4
    |    |       |- sub collection document 1
    |    |       |- sub collection document 2
    |-Emails
            |-Email Document 1
            |-Email Document 2
            |-Email Document 3
            |-Email Document 4
```   

**Assumptions Made**:
1. The nesting of subcollection goes down only 1 level deep. Ex: Collection -> sub-collection (1 deep)
2. Source and Destination projects are different firebase projects. 

# File Directory Structure
---
- __Firestore\-Data\-Export\-Migration\-Tool__
   - [README.md](README.md)
   - __client__
     - [package.json](client/package.json)
     - __src__
       - [App.css](client/src/App.css)
       - [App.tsx](client/src/App.tsx)
       - __components__
         - [fileUploader.tsx](client/src/components/fileUploader.tsx)
         - [migrationDashboard.tsx](client/src/components/migrationDashboard.tsx)
       - [index.css](client/src/index.css)
       - [index.tsx](client/src/index.tsx)
       - [react\-app\-env.d.ts](client/src/react-app-env.d.ts)
       - [reportWebVitals.ts](client/src/reportWebVitals.ts)
       - __services__
         - [migration.ts](client/src/services/migration.ts)
         - [migrationData.ts](client/src/services/migrationData.ts)
         - [serviceAccountList.txt](client/src/services/serviceAccountList.txt)
     - [tsconfig.json](client/tsconfig.json)
   - [package.json](package.json)
   - __server__
     - [index.ts](server/index.ts)
     - [migrationSchema.ts](server/migrationSchema.ts)
   - __src__
     - __service\-accounts\-creds__
       - [README.md](src/service-accounts-creds/README.md)
   - [tsconfig.json](tsconfig.json)
   - [tslint.json](tslint.json)

