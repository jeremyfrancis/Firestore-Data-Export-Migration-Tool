import * as Contacts from "expo-contacts";
import firebase from "firebase";
import { firestore } from "firebase-admin";
export interface iDBList {
  id?: number;
  projectId?: string;
  connectionSuccess?: string;
}

export interface iCollection {
  id?: number;
  collectionName?: string;
}

export interface iServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
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
  _teamId: string;
  baseShopId: string;
  theme: THEME;
  personali: dPersonali;
  growth?: dGrowth;
  allLevelsCompleted: boolean;
  roles?: FRBS_ROLE[];
  completedLevelItems: string[];
  createdAt?: firestore.FieldValue;
  notifications?: { lastRead: firestore.FieldValue };
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
  lastSignIn: firestore.FieldValue;
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
  BS = "BS:",
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
  createdAt: firestore.FieldValue;
  lastSignIn: firestore.FieldValue;
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
    lists: dMobListBuilderList[];
    /**
     * All the user ids this user has given permission to view their personal profile, specifically their contact lists
     */
    shareTo: string[];
  };
  notifications?: {
    lastRead: firestore.FieldValue;
  };
  /**
   * If user is currently imitating/simulating
   * another user's account to test their account
   */
  imitate?: boolean;
  /**
   * The team the user has joined, if they have joined a team
   */
  team?: dTeam;
}
export interface dTeam {
  role: string;
  /**@description This is the name of the teampage located in pages collection */
  teamName: string;
}
export interface dMobListBuilderList {
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
  /**
   * @deprecated This has been replaced by qualifications field
   */
  points?: number[];
  /**
   * @description This array holds value value from MACHO enum
   */
  qualifications?: MACHO[];
  /**
   * @deprecated The list Id will indicate what list this contact belongs to.
   *             This is now moved to groups
   */
  listId: string;
  /**
   * @description The groups will indicate what contact-group this contact belongs to.
   *              A contact can belong to multiple contact-groups at a time.
   */
  groups: string[];
  /**
   * @description This field is utilized for BML-Web feature. The value of this field will be in format "rowId:columnId" format.
   * @example: "3:5" This means the contact belongs to lane 5 (in Trello style board) and vertical position 3 in that lane.
   */
  lanePositionId: string;
  profileImage?: string;
}

/**
 * @description Qualification enum for MACHO
 * - M = Married
 * - A = Age (20-55)
 * - C = Children
 * - H = HomeOwner
 * - O = Occupation(Job)
 */
export enum MACHO {
  "MARRIED" = "M",
  "AGE" = "A",
  "CHILDREN" = "C",
  "HOMEOWNER" = "H",
  "OCCUPATION" = "O",
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

export interface MobMediaPageSchema {
  /**
   * Project-id from the firebase, this is used for collaboration feature
   */
  teamID?: string;

  /**
   * This field is equal to appTitle in "variables" document under "config" collection
   */
  teamName?: string;

  /**
   * Boolean field indicating if this page is shared for collaboration with other apps
   */
  collaboration: boolean;

  /**
   * Field only needed by collaboration logic.
   */
  api?: string;
  _id: string;

  key?: string;
  /**
   * This is id for collabTeams collection in ICF-AppTakeOff project
   */
  collabPageId?: string;
  /**
   * If this is a team that has a zoom link or ID it can go here
   */
  zoom?: string;
  /**
   * If the page requires a password to get into
   */
  password?: string | number;
  /**
   * Configuration for how the page might display and function in the "Media" area of the app
   */
  mediaItem: {
    /**
     * @deprecated Image displays as is now
     */
    imageColor?: string;
    /**
     * @deprecated There is only 1 default color now
     */
    color?: string;
    /**
     * Open a URL instead of a page
     */
    link?: string;
    /**
     * Give the page a custom icon
     */
    logo?: string;
    /**
     * Use an icon that the app supports locally
     */
    presetLogo?: string;
    /**
     * Whether or not this media page represents a team
     */
    team?: boolean;
    /**
     * If true or "true", will be displayed directly on the "Media" area of the app
     */
    visible?: boolean | string;
  };
  /**
   * The name of the page :D
   */
  name: string;
  /**
   * Configuration for how the page might display and function in the home page of the app
   * @deprecated Now using social feature to control content of the home screen
   */
  pageItem: {
    description?: string;
    imageUrl?: string;
    uploadImage?: string;
    visible: boolean | string;
    link?: string;
  };
  /**
   * Order in which the page might show up on the "Media" area of the app.
   * For example, a media page with position -3 will show up before one with position 1
   */
  position: number;
  /**
   * All of the content items the page contains
   */
  content?: dMobMediaPageItem[];
  /**
   * All the app tokens related to config
   */
  keys?: dMobConfigKeys;
}

export interface dMobConfigKeys {
  calendarAccessToken?: string;
  calendarId?: string;
  dropbox?: string[];
  vimeo?: VimeoToken[];
}

export interface dMobConfigVariables {
  adminPassword: string;
  appPassword: string;
  appTakeoffShareURL?: string;
  appTitle: string;
  disableCalendar: boolean;
  disableContactManager: boolean;
  disableScoreboard: boolean;
  disableMore: boolean;
  enablePushNotifications: boolean;
  googleDrive?: { folderId: string };
  levels?: {
    allowLevelSkipping?: boolean;
    lockMedia?: boolean;
  };
  listBuilder: {
    defaultLists: dMobListBuilderList[];
  };
  bmlQuestionnaire?: dMobQuestionScreenItem[];
  releaseVersion?: string;
  updateURL?: string;
  reviewMode?: boolean;
  videoCalls?: { title: string; meetingId: string }[];
  welcomeMail?: string;
  isDataSyncEnabled?: boolean;
}

export interface dMoreItem {
  _id: string;
  name: string;
  position: number;
  logo?: string;
  iosLink?: string;
  androidLink?: string;
  contactEmail?: string;
  contactPhone?: string;
  otherLink?: string;
}
export interface dMobQuestionScreenItem {
  id: string;
  question: string;
  screenType: string;
  isActive: boolean;
  canEdit: boolean;
}

export interface VimeoToken {
  accessToken: string;
  userId: string;
}
export interface dMobMediaPageItem {
  id?: string;
  /**
   * The title of this item!
   */
  title?: string;
  /**
   * Show some longer paragraph text on the screen
   */
  paragraph?: string;
  /**
   * A link to either a video or audio file on a supported service like an integrated Vimeo account, Cloudinary, or Dropbox
   */
  media?: string;
  /**
   * To open a web page in the app (or outside of the app)
   */
  url?: string;
  /**
   * If value is provided, this item will be a button that opens another MediaPage that exists in the app
   */
  topage?: string;
  /**
   * Order in which this item is displayed on the page
   * For example, an item with position -3 will show up before one with position 1
   */
  position: number;

  createdAt: FirebaseFirestore.FieldValue;
}

//#endregion

//#region [region1] "possts" schema

/**
 * ### Posst Doc Schema
 *
 * ---
 * @version 1.1.20
 * @author  nguyenkhooi
 * ---
 * @example see MOCK_POSST
 */
export interface MobPosstSchema {
  _pid: string;
  author: {
    _id: string;
    /**
     * @deprecated maybe since name & avatar might be changed
     */
    name: string;
    /**
     * @deprecated maybe since name & avatar might be changed
     */
    avatar: string;
  };
  body: string;
  /**
   * The doc id of the page to open
   */
  goToPage?: string;
  /**
   * @deprecated soon
   */
  media?: {
    uri: string;
    type: "image" | "video";
  };
  medias: {
    uri: string;
    type: "image" | "video";
  }[];
  createdAt: firebase.firestore.FieldValue;
  updatedAt: firebase.firestore.FieldValue;
  scheduledAt: firebase.firestore.FieldValue;
  /**
   * Array of uids who have liked the posst
   */
  likes: string[];
  status: POSST_STATUS;
  pinned: boolean;
  /**
   * The number of comments that there are, so you can know this without having to fetch the comments collection
   */
  commentCount: number;
}

export enum POSST_STATUS {
  /**
   * ###  Whether posst is posted or not
   * -  Useful for scheduled posst
   */
  POSTED = "POSTED",
  PENDING = "PENDING",
  DELETED = "DELETED",
  REPORTED = "REPORTED",
  SCHEDULED = "SCHEDULED",
}
export interface dUserPWDData {
  uid: string;
  passwordHash: string;
  passwordSalt: string;
}

export interface dPasswordHash {
  algorithm: string;
  base64_signer_key: string;
  base64_salt_separator: string;
  rounds: number;
  mem_cost: number;
}

export interface dListOfPasswordHash {
  [projectId: string]: dPasswordHash;
}

export enum WEBFPATH {
  CONFIG = "configs",
  MORE = "more",
  PAGES = "pages",
  POSSTS = "possts",
  COMMENTS = "comments",
  SCOREBOARDS = "scoreboards",
  USERS = "users",
  CUSTOM_PAGE_CONTENT = "pageContent",
  CONTACT_GROUPS = "contact-groups",
  CONTACTS = "contacts",
}

export enum MOBFPATH {
  CONFIG = "config",
  MORE = "more",
  PAGES = "pages",
  POSSTS = "possts",
  COMMENTS = "comments",
  SCOREBOARDS = "scoreboard",
  USERS = "users",
  CUSTOM_PAGE_CONTENT = "pageContent",
}
