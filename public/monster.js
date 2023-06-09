import { EGG_NAMES_PRE, EGG_NAMES_SUF, MONSTER_NAMES, MONSTER_FLAVORS, SATIETY_TITLES } from "./monster_init_base.js";
import apiRequest from "./apirequest.js";

const template = document.querySelector(".template.monster");

// initializing constants here
let EGG_NAMES_PRE_SIZE = EGG_NAMES_PRE.length;
let EGG_NAMES_SUF_SIZE = EGG_NAMES_SUF.length;
let MONSTER_NAMES_SIZE = MONSTER_NAMES.length;
let MONSTER_FLAVORS_SIZE = MONSTER_FLAVORS.length;
let SATIETY_TITLES_SIZE = SATIETY_TITLES.length;
let SATIETY_COUNTDOWN_MIN = 5;
let SATIETY_COUNTDOWN_MAX = 20;
let HATCH_COUNTDOWN_DISPLAY = "Time till hatch: ";
let HATCH_READY_DISPLAY = "Ready to hatch!";
let EVOLUTION_COUNTDOWN_DISPLAY = "Time till next evolution: ";
let EVOLUTION_READY_DISPLAY = "Ready to evolve!";

// helper function for determining satiety countdowns and egg names
let getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default class Monster {
  // This function adds a monster to the backend hatchery database.
  static async _addToHatchery(info, google) {
    let newMonster = {
      "owner": info.owner,
      "eggName": info.eggName,
      "hatched": info.hatched,
      "name": info.name,
      "flavor": info.flavor,
      "age": info.age,
      "halt": info.halt,
      "satiety": info.satiety,
      "satietyInterval": info.satietyInterval
    };
    let apiData = null;
    if (google) {
      apiData = await apiRequest("POST", `/protected/roster`, newMonster, window.API_KEY);
    } else {
      apiData = await apiRequest("POST", `/users/${info.owner}/roster`, newMonster, null);
    }
    return apiData;
  }

  // This function creates a new Monster and returns info.
  static async summon(owner, google) {
    let info = {
      _id: null,
      owner: owner,
      eggName: null,
      hatchDate: null,
      hatched: false,
      name: null,
      flavor: null,
      age: 0,
      halt: false,
      evolveDate: null,
      satiety: 0,
      satietyInterval: getRandomNumber(SATIETY_COUNTDOWN_MIN, SATIETY_COUNTDOWN_MAX),
      lastFed: null
    };
    // initialize our randomized variables
    info.eggName = `${EGG_NAMES_PRE[getRandomNumber(0, EGG_NAMES_PRE_SIZE-1)]} ${EGG_NAMES_SUF[getRandomNumber(0, EGG_NAMES_SUF_SIZE-1)]} egg`;
    info.name = MONSTER_NAMES[getRandomNumber(0, MONSTER_NAMES_SIZE-1)];
    info.flavor = MONSTER_FLAVORS[getRandomNumber(0, MONSTER_FLAVORS_SIZE-1)];

    // _id, hatchDate, evolveDate, and lastFed are all initialized in the backend, so
    // we want to update it here before returning info
    let apiData = await this._addToHatchery(info, google);
    info._id = apiData._id;
    info.hatchDate = apiData.hatchDate;
    info.evolveDate = apiData.evolveDate;
    info.lastFed = apiData.lastFed;
    return info;
  }

  constructor(data, app) {
    let currentTime = new Date(); // capturing time to calculate countdowns

    // initializing many of our needed variables from the passed-in data
    this._id = data._id;
    this.owner = data.owner;
    this.eggName = data.eggName;
    this.hatchDate = new Date(data.hatchDate);
    this.hatched = data.hatched;
    this.name = data.name;
    this.flavor = data.flavor;
    this.age = data.age;
    this.halt = data.halt;
    this.evolveDate = new Date(data.evolveDate);
    this.satiety = data.satiety;
    this.satietyInterval = data.satietyInterval;
    this.lastFed = new Date(data.lastFed);

    // storing app allows us to update the app's _hatchery when this monster is released
    this.app = app;

    // initializing variables related to html elements
    this.htmlMonster = template.cloneNode(true);
    this.htmlEggName = this.htmlMonster.querySelector(".eggName");
    this.htmlNextHatch = this.htmlMonster.querySelector(".nexthatch");
    this.htmlName = this.htmlMonster.querySelector(".name");
    this.htmlSatiety = this.htmlMonster.querySelector(".satiety");
    this.htmlFlavor = this.htmlMonster.querySelector(".flavor");
    this.htmlNextEvolve = this.htmlMonster.querySelector(".nextevolve");
    this.htmlHalt = this.htmlMonster.querySelector(".haltstatus");
    this.buttons = this.htmlMonster.querySelector(".buttons");

    // event handlers for monster buttons
    this._handleHatch = this._handleHatch.bind(this);
    this.htmlMonster.querySelector(".hatch").addEventListener("click", this._handleHatch);

    this._handleFeed = this._handleFeed.bind(this);
    this.buttons.querySelector(".feed").addEventListener("click", this._handleFeed);

    this._handleRelease = this._handleRelease.bind(this);
    this.htmlMonster.querySelector(".release").addEventListener("click", this._handleRelease);

    this._handleHalt = this._handleHalt.bind(this);
    this.buttons.querySelector(".halt").addEventListener("click", this._handleHalt);

    this._handleSend = this._handleSend.bind(this);
    this.buttons.querySelector(".send").addEventListener("click", this._handleSend);

    // replace template names and description
    this.htmlEggName.textContent = this.eggName;
    // calculate minutes to display till hatch
    let hatchMinDiff = Math.floor((this.hatchDate.getTime() - currentTime.getTime()) / (1000 * 60));
    if (hatchMinDiff < 0) {
      this.htmlNextHatch.textContent = HATCH_READY_DISPLAY;
      this.htmlMonster.querySelector(".hatch").classList.remove("hidden");
    } else {
      this.htmlNextHatch.textContent = HATCH_COUNTDOWN_DISPLAY + hatchMinDiff + " minutes";
    }
    // if hatched already, we can just set the relevant items to be invisible / visible
    if (this.hatched) {
      // make all relevant fields invisible
      this.htmlEggName.classList.add("noneed");
      this.htmlNextHatch.classList.add("noneed");
      this.htmlMonster.querySelector(".hatch").classList.add("noneed");

      // make all relevant monster fields visible
      this.htmlName.classList.remove("beforehatch");
      this.htmlSatiety.classList.remove("beforehatch");
      this.htmlFlavor.classList.remove("beforehatch");
      this.htmlNextEvolve.classList.remove("beforehatch");
      this.htmlHalt.classList.remove("beforehatch");
      this.buttons.querySelector(".feed").classList.remove("beforehatch");
      this.buttons.querySelector(".halt").classList.remove("beforehatch");
    }

    this.htmlName.textContent = this.name;
    this.htmlFlavor.textContent = this.flavor[this.age];
    // calculate satiety
    let satMinDiff = Math.floor((currentTime.getTime() - this.lastFed.getTime()) / (1000 * 60));
    if (satMinDiff >= this.satiety) this.satiety = 0;
    if (this.satiety > 0) this.satiety -= satMinDiff;
    let satietyDex = Math.floor(this.satiety/this.satietyInterval);
    this.htmlSatiety.textContent = "Satiety level: " + SATIETY_TITLES[satietyDex];
    // calculate minutes to display till next evolution
    let evolMinDiff = Math.floor((this.evolveDate.getTime() - currentTime.getTime()) / (1000 * 60));
    if (this.age === 2) {
      this.htmlNextEvolve.classList.add("noneed");
      this.htmlHalt.classList.add("noneed");
      this.buttons.querySelector(".halt").classList.add("noneed");
    }
    if (evolMinDiff < 0) {
      this.htmlNextEvolve.textContent = EVOLUTION_READY_DISPLAY;
    } else {
      this.htmlNextEvolve.textContent = EVOLUTION_COUNTDOWN_DISPLAY + evolMinDiff + " minutes";
    }
    if (this.halt) {
      this.htmlHalt.classList.remove("hidden");
      this.htmlNextEvolve.classList.add("hidden");
    }
    // making the monster visible
    this.htmlMonster.classList.remove("template");
  }

  // adds monster to the webpage
  addToHtmlHatchery() {
    document.querySelector("#roster").append(this.htmlMonster);
  }

  // releases monster from user's hatchery
  async release() {
    this.htmlMonster.remove(); // remove from webpage

    // update hatchery object in app.js
    this.app.removeFromLocalHatchery(this._id);

    // update backend
    await apiRequest("DELETE", `/monsters/${this._id}`);
  }

  async monsterUpdate() {
    // update hatch countdown status
    let currentTime = new Date();
    let hatchMinDiff = Math.floor((this.hatchDate.getTime() - currentTime.getTime()) / (1000 * 60));
    if (hatchMinDiff < 0) {
      // ready to hatch, so display button
      this.htmlNextHatch.textContent = HATCH_READY_DISPLAY;
      this.htmlMonster.querySelector(".hatch").classList.remove("hidden");
    } else {
      // not ready to hatch, so display countdown
      this.htmlNextHatch.textContent = HATCH_COUNTDOWN_DISPLAY + hatchMinDiff + " minutes";
    }

    // update satiety status
    if (this.satiety > 0) this.satiety--;
    let satietyDex = Math.floor(this.satiety/this.satietyInterval);
    this.htmlSatiety.textContent = "Satiety level: " + SATIETY_TITLES[satietyDex];
    await apiRequest("PATCH", `/monsters/${this._id}`, { "satiety": this.satiety }, null);

    // update evolution countdown status
    let evolMinDiff = Math.floor((this.evolveDate.getTime() - currentTime.getTime()) / (1000 * 60));
    if (evolMinDiff < 0) {
      // ready to evolve
      this.htmlNextEvolve.textContent = EVOLUTION_READY_DISPLAY;
    } else {
      // not ready to evolve, so display countdown
      this.htmlNextEvolve.textContent = EVOLUTION_COUNTDOWN_DISPLAY + evolMinDiff + " minutes";
    }
  }

  // This function makes the monster "grow" from a baby to an adolescent to an adult.
  async _evolve() {
    // if the monster is halted, or an adult, or not satiated, or not ready to evolve, then don't evolve
    let currentTime = new Date;
    let evolMinDiff = Math.floor((this.evolveDate.getTime() - currentTime.getTime()) / (1000 * 60));
    let satietyDex = Math.floor(this.satiety/this.satietyInterval);
    if (this.halt === true || this.age === 2 || satietyDex < 7 || evolMinDiff > 0) return;

    // increase the monster's age
    this.age++;
    if (this.age === 2) {
      // if adult, we don't need the evolve countdown or the halt button + status
      this.htmlNextEvolve.classList.add("noneed");
      this.htmlHalt.classList.add("noneed");
      this.buttons.querySelector(".halt").classList.add("noneed");
    }
    // update the flavor text for the monster to reflect age
    this.htmlFlavor.textContent = this.flavor[this.age];
    console.log("evolve!");

    // update backend
    let response = await apiRequest("PATCH", `/monsters/${this._id}`, { "age": this.age }, null);
    if (response.evolveDate !== undefined) {
      // if we have a new evolve date, then update it and display the appropriate countdown
      this.evolveDate = new Date(response.evolveDate);
      evolMinDiff = Math.floor((this.evolveDate.getTime() - currentTime.getTime()) / (1000 * 60));
      this.htmlNextEvolve.textContent = EVOLUTION_COUNTDOWN_DISPLAY + evolMinDiff + " minutes";
    }
  }

  async _hatch() {
    // make all relevant fields invisible
    this.htmlEggName.classList.add("noneed");
    this.htmlNextHatch.classList.add("noneed");
    this.htmlMonster.querySelector(".hatch").classList.add("noneed");

    // make all relevant monster fields visible
    this.htmlName.classList.remove("beforehatch");
    this.htmlSatiety.classList.remove("beforehatch");
    this.htmlFlavor.classList.remove("beforehatch");
    this.htmlNextEvolve.classList.remove("beforehatch");
    this.htmlHalt.classList.remove("beforehatch");
    this.buttons.querySelector(".feed").classList.remove("beforehatch");
    this.buttons.querySelector(".halt").classList.remove("beforehatch");

    // update backend
    let response = await apiRequest("PATCH", `/monsters/${this._id}`, { "hatched": this.hatched }, null);
    if (response.evolveDate !== undefined) {
      // we should have a new evolve date, so update it and display the appropriate countdown
      let currentTime = new Date();
      this.evolveDate = new Date(response.evolveDate);
      let evolMinDiff = Math.floor((this.evolveDate.getTime() - currentTime.getTime()) / (1000 * 60));
      this.htmlNextEvolve.textContent = EVOLUTION_COUNTDOWN_DISPLAY + evolMinDiff + " minutes";
    }
  }

  async _feed() {
    // first check if the user has enough meat to feed the monster.
    let canFeed = this.app.checkMeat(this.satietyInterval);
    if (!canFeed) {
      alert(`Not enough meat! You need ${this.satietyInterval} pieces of meat total to feed ${this.name}.`);
      return;
    }
    await this.app.useMeat(this.satietyInterval); // use up meat

    // call evolve(): if the requirements are met, it will evolve
    await this._evolve();

    // calculate the satiety based on satietyInterval, then display the correct satiety title
    let satietyDex = Math.floor(this.satiety/this.satietyInterval);
    if (satietyDex === SATIETY_TITLES_SIZE-1) return;
    this.satiety += this.satietyInterval;
    satietyDex = Math.floor(this.satiety/this.satietyInterval);
    this.htmlSatiety.textContent = "Satiety level: " + SATIETY_TITLES[satietyDex];

    // update backend
    await apiRequest("PATCH", `/monsters/${this._id}`, { "satiety": this.satiety }, null);
  }

  // This function toggles the monster's halt status.
  // If the monster is halted, it will not evolve in any condition.
  // If the monster is not halted, it will evolve given proper conditions.
  async _halt() {
    this.halt = !this.halt; // toggle halt
    if (this.halt) { // depending on this.halt, the correct status will be displayed
      this.htmlHalt.classList.remove("hidden");
      this.htmlNextEvolve.classList.add("hidden");
    } else {
      this.htmlHalt.classList.add("hidden");
      this.htmlNextEvolve.classList.remove("hidden");
    }
    // update backend
    await apiRequest("PATCH", `/monsters/${this._id}`, { "halt": this.halt }, null);
  }

  // Event handlers

  async _handleHatch(event) {
    this.hatched = true;
    await this._hatch();
    console.log("hatched!");
  }

  async _handleFeed(event) {
    await this._feed();
    console.log("feed!");
  }

  async _handleRelease(event) {
    let confirmMessage = null;
    if (this.hatched) {
      confirmMessage = `Are you sure you want to release ${this.name}? This is irreversible, and it will never come back.`;
    } else {
      confirmMessage = `Are you sure you want to get rid of ${this.eggName}? The hatching of a baby monster is a scene to remember.`;
    }
    if (window.confirm(confirmMessage)) {
      // do nothing. let the rest of the function run
    } else {
      console.log("release aborted!");
      return;
    }

    await this.release();
    console.log("release!");
  }

  async _handleHalt(event) {
    await this._halt();
    console.log("halt!");
  }

  // this function purposefully not implemented for the
  // final project
  _handleSend(event) {
    console.log("send!");
  }
}
