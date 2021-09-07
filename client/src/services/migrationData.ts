import { list as listData } from "./serviceAccountList";
export interface iDBList {
  id?: number;
  projectId?: string;
  connectionSuccess?: string;
}

export enum APIROUTE {
  "MIGRATION" = "/migration",
}

export interface iCollection {
  id?: number;
  collectionName?: string;
}

export const getCollectionsList = () => {
  const collections: iCollection[] = [
    {
      id: 0,
      collectionName: "Select All Collections",
    },
    {
      id: 1,
      collectionName: "config",
    },
    {
      id: 2,
      collectionName: "emails",
    },
    {
      id: 3,
      collectionName: "email-templates",
    },
    {
      id: 4,
      collectionName: "email-schedules",
    },
    {
      id: 5,
      collectionName: "more",
    },
    {
      id: 6,
      collectionName: "notifications",
    },
    {
      id: 7,
      collectionName: "pages",
    },
    {
      id: 8,
      collectionName: "possts",
    },
    {
      id: 9,
      collectionName: "scoreboard",
    },
    {
      id: 10,
      collectionName: "users",
    },
  ];
  return collections;
};

export const getProdDBList = () => {
  const dbList: iDBList[] = [];
  //@ts-ignore
  listData
    .sort((a, b) => a.localeCompare(b))
    .forEach((list: string, index: number) => {
      const data = {
        id: index + 1,
        projectId: list,
        connectionSuccess: "",
      };
      dbList.push(data);
    });
  return dbList;
};
