export interface iDBList {
  id?: number;
  projectId?: string;
  connectionSuccess?: string;
}

export enum APIROUTE {
  "MIGRATION" = "/migration",
}

// export const collNames = [
//   "config",
//   "eventSlider",
//   "more",
//   "notifications",
//   "pages",
//   "possts",
//   "scoreboard",
//   "users",
// ];

export const getProdDBList = () => {
  const dbList: iDBList[] = [
    {
      id: 1,
      projectId: "app-takeoff-automate-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 2,
      projectId: "app-takeoff-dev-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 3,
      projectId: "app-takeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 4,
      projectId: "app-takeoff-team-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 5,
      projectId: "barragan-familia-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 6,
      projectId: "benitez-rising-stars-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 7,
      projectId: "brix-realty-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 8,
      projectId: "carreon-hierarchy-mb2-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 9,
      projectId: "chamorro-hierarchy-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 10,
      projectId: "church-app-demo-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 11,
      projectId: "corporateraiders-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 12,
      projectId: "crusaders-app-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 13,
      projectId: "dominators-mier-hierarchy-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 14,
      projectId: "dream-team-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 15,
      projectId: "dream-team-drake-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 16,
      projectId: "elite-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 17,
      projectId: "flores-fanatics-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 18,
      projectId: "freedom-fighters-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 19,
      projectId: "freedom-fighters-divita-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 20,
      projectId: "freedom-force-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 21,
      projectId: "huffmans-heroes-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 22,
      projectId: "iron-life-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 23,
      projectId: "landrum-international-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 24,
      projectId: "landrumlegends-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 25,
      projectId: "legacy-builders-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 26,
      projectId: "legacybuilders-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 27,
      projectId: "legacyoflegends-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 28,
      projectId: "level-up-hierarchy-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 29,
      projectId: "limitless-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 30,
      projectId: "millertime-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 31,
      projectId: "mitchell-miracle-makers-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 32,
      projectId: "never-tolerate-average-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 33,
      projectId: "nextlevel-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 34,
      projectId: "one-team-one-dream-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 35,
      projectId: "one-team-one-dream-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 36,
      projectId: "powerteam-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 37,
      projectId: "preloaded-primerica-content-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 38,
      projectId: "primerica-admin-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 39,
      projectId: "primerica-template-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 40,
      projectId: "run-fields-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 41,
      projectId: "rvp-builders-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 42,
      projectId: "sanders-crusade-nation-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 43,
      projectId: "seed-14719-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 44,
      projectId: "shepardsuperteam-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 45,
      projectId: "skyscraper-primerica-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 46,
      projectId: "superbase-cd4c1-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 47,
      projectId: "team-canada-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 48,
      projectId: "team-diehl-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 49,
      projectId: "team-hughes-all-in-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 50,
      projectId: "team-impact-2f2f0-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 51,
      projectId: "team-lavination-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 52,
      projectId: "team-tenacious-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 53,
      projectId: "team-unstoppable-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 54,
      projectId: "team-xplosion-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 55,
      projectId: "team-xtreme-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 56,
      projectId: "thechargingrhinos-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 57,
      projectId: "tri2gether-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 58,
      projectId: "visionaries-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 59,
      projectId: "world-changers-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 60,
      projectId: "wyd1-apptakeoff-service-account.json",
      connectionSuccess: "",
    },
    {
      id: 61,
      projectId: "xtreme-nation-service-account.json",
      connectionSuccess: "",
    },
  ];

  return dbList;
};
