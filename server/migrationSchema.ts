import * as Contacts from "expo-contacts";
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

//#region [rgba(255,0,90,0.1)] //TODO SCHEMA's related to scoreboard

export interface MobileScoreboardSchema {
  title: string;
  subtitle?: string;
  id: string;
  position: number;
  people: dMobileScore[];
}

export interface dMobileScore {
  uid: string;
  name: string;
  score: number;
}

export interface WebScoreboardSchema {
  _sbid: string;
  /**
   * @description id from the Mobile Schema. id and _sbid are not identical.
   * id here is the title of scoreboard in Mobile Scoreboards.
   */
  id: string;
  title: string;
  subtitle?: string;
  position: number;
  people: dWebScore[];
  createdAt?: firebase.firestore.FieldValue;
}

export interface dWebScore {
  uid: string;
  name: string;
  score: number;
}
//#endregion

//#region [rgba(120,255,0,0.1)] //TODO SCHEMA's related to user
export interface WebUserSchema {
  _id: string;
  uid?: string;
  theme: THEME;
  personali: dPersonali;
  growth?: dGrowth;
  roles?: FRBS_ROLE[];
  completedLevelItems: string[];
  createdAt?: Date;
  notifications?: { lastRead: Date };
  /** for DEV */
  imitate?: boolean;
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
  oldMobileSchemaData: any;
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
  allLevelsCompleted: boolean;
  levels: {};
  /** @deprecated maybe? move to growth */
  team?: string;
}

// interface test {
//   listBuilder: {
//     lists: dListBuilderList[];
//     shareTo: string[];
//   };
// }

export enum THEME {
  NULL = "null",
  LIGHT = "themeLight",
  DARK = "themeDark",
}
interface dPersonali extends Partial<firebase.UserInfo> {}

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
  levels?: { [key: string]: any };
  listBuilder?: {
    lists: dListBuilderList[];
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

export interface dListBuilderList {
  title: string;
  id: string;
  contacts: Contact[];
}
export interface dContactSuggestion extends Partial<Contacts.Contact> {
  _cid: string;
  displayName: string;
  phoneNumbers: Contacts.PhoneNumber[];
  email?: string;
  /**
   * @description Pointer is a way to classifying contacts/potential customers
   * ---
   * 5-4: Warm market contact
   *
   * 3-2-1: Cold market contact
   */
  pointers: "1" | "2" | "3" | "4" | "5" | "";
  points?: number[];
  /**
   * @description null for outside and if it contains value then that contact is an app member.
   */
  _uid?: string;
  /**
   * @description The list Id will indicate what list this contact belongs to.
   *              A contact can belong to only one list at a time.
   */
  listId: string;
  /**
   * @description This field is utilized for BML-Web feature. The value of this field will be in format "rowId:columnId" format.
   * @example: "3:5" This means the contact belongs to lane 5 (in Trello style board) and vertical position 3 in that lane.
   */
  lanePositionId: string;
  profileImage?: string;
}

export interface ContactGroupSchema {
  _id: string;
  name: string;
  groupType: string; //CONTACTGROUPTYPE;
  //contacts: { displayName: string; phoneNumber?: number; email: string }[];
  contacts: string[];
  shareTo: WebUserSchema["_id"][];
}

export interface EmailAddress {
  label: string;
  email: string;
}

export interface PhoneNumber {
  label: string;
  number: string;
}

export interface PostalAddress {
  label: string;
  formattedAddress: string;
  street: string;
  pobox: string;
  neighborhood: string;
  city: string;
  region: string;
  state: string;
  postCode: string;
  country: string;
}

export interface InstantMessageAddress {
  username: string;
  service: string;
}

export interface Birthday {
  day: number;
  month: number;
  year: number;
}

export interface Contact {
  recordID: string;
  backTitle: string;
  company: string;
  emailAddresses: EmailAddress[];
  familyName: string;
  givenName: string;
  middleName: string;
  jobTitle: string;
  phoneNumbers: PhoneNumber[];
  hasThumbnail: boolean;
  thumbnailPath: string;
  postalAddresses: PostalAddress[];
  prefix: string;
  suffix: string;
  department: string;
  birthday: Birthday;
  imAddresses: InstantMessageAddress[];
  note: string;
}

//#endregion
