import firebase from "firebase";
export interface iDBList {
  id?: number;
  projectId?: string;
  connectionSuccess?: string;
}

export interface iCollection {
  id?: number;
  collectionName?: string;
}

//#region
export interface WebUserSchema {
  _id: string;
  uid?: string;
  theme: THEME;
  personali: dPersonali;
  growth?: dGrowth;
  roles?: FRBS_ROLE[];
  createdAt?: Date;
  notifications?: { lastRead: Date };
  /** for DEV */
  imitate: boolean;
  /** @deprecated maybe? move to personali */
  name?: string;
  email?: string;
  /** @deprecated maybe? move to personali */
  phoneNumber?: string;
  /** @deprecated maybe? switch to roles */
  admin?: boolean;
  /** @deprecated maybe? switch to roles */
  banned?: boolean;
  team?: string;
}

export enum FRBS_ROLE {
  /**
   * Devs team,
   * those who can access to FRBS admin
   */
  ADMIN = "ADMIN",
  /**
   * Team leader,
   * who lead the big team
   */
  LEADER = "LEADER",
  /**
   * Hierarchy leader,
   * who lead the hierarchy/branch of the team
   */
  HEADER = "HEADER",
  /**
   * New member of the team,
   * who hasn't finished onboarding tasks
   */
  NEWBIE = "NEWBIE",
  BANNED = "BANNED",
}

/**
 * ###  Fields related to user's personal development
 */
interface dGrowth {
  allLevelsCompleted: false;
  levels: {};
  listBuilder: {
    lists: any[];
    shareTo: string[];
  };
  /** @deprecated maybe? move to growth */
  team?: string;
}

export enum THEME {
  NULL = "null",
  LIGHT = "themeLight",
  DARK = "themeDark",
}
interface dPersonali extends Partial<firebase.UserInfo> {}
//#endregion

//#region MobileUserSchema
export interface MobileUserSchema {
  uid?: string;
  /**
   * Firebase cloud messaging tokens (push notifications)
   * - each token represents a device that notifications can be sent to individually
   */
  fcmTokens?: string[];
  name?: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
  createdAt: Date;
  lastSignIn: Date;
  appVersion: string;
  /**
   * Whether or not the user has access to admin functionalities throughout the app
   */
  admin?: boolean;
  /**
   * If the user is banned, they will get kicked out of the app when opening it
   */
  banned?: boolean;
  /**
   * If the user has gone through all levels in the "New? Start here!" area, this is true, OR if an admin set this to true allowing them to bypass going through all the levels manually
   */
  allLevelsCompleted?: boolean;
  /**
   * Lists each level and the individual items of each level the user has completed
   */
  levels?: {};
  listBuilder?: {
    lists: any[];
    /**
     * All the user ids this user has given permission to view their personal profile, specifically their contact lists
     */
    shareTo: string[];
  };
  notifications?: {
    lastRead: Date;
  };
  /**
   * If user is currently imitating/simulating
   * another user's account to test their account
   */
  imitate?: boolean;
  /**
   * The team the user has joined, if they have joined a team
   */
  team?: string;
}
//#endregion
