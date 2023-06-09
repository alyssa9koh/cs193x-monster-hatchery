import User from "./user.js";
import Monster from "./monster.js";
import apiRequest from "./apirequest.js";
import GoogleAuth from "./googleauth.js";

let CLIENT_ID = "493157086685-icbmcv4iuv0daij5kmnhv80kipr35bq1.apps.googleusercontent.com";
let TIMEOUT_INTERVAL = 5000; // determines how many milliseconds until the next _periodicUpdate runs
let MEAT_INCREASE = TIMEOUT_INTERVAL / 1000; // determines how much meat will be added every time _periodicUpdate runs

export default class App {
  constructor() {
    this.timeoutId = null;

    this.user = null;
    this._google = false;
    this._hatchery = {}; // contains keys of monster._id and values of Monster objects

    this.htmlMeat = document.querySelector("#meat");
    this._toolbar = document.querySelector("#toolbar");

    // SUMMON: handlers and functions
    this._handleSummon = this._handleSummon.bind(this);
    this._toolbar.children.summon.addEventListener("click", this._handleSummon);

    // ABANDON: handlers and functions
    this._handleAbandon = this._handleAbandon.bind(this);
    this._toolbar.children.abandon.addEventListener("click", this._handleAbandon);

    // LOGIN: handlers and functions
    this._loginForm = document.querySelector("#loginForm");
    this._onLoginSubmit = this._onLoginSubmit.bind(this);
    this._loginForm.addEventListener("submit", this._onLoginSubmit);

    // GOOGLE LOGIN
    this.googleAuth = new GoogleAuth(CLIENT_ID);
    this.htmlGoogleAuth = document.querySelector("#googleAuth");
    this._googleLogin = this._googleLogin.bind(this);
    this.googleAuth.render(this.htmlGoogleAuth, this._googleLogin);
  }

  // handles logging in the user through Google authentication
  async _googleLogin(idToken) {
    let data = await apiRequest("POST", "/login", { idToken });
    window.API_KEY = data.apiKey;
    this._google = true;

    // get appropriate User instance
    data = await User.loadOrCreate(data.email, data.name, true);
    this.user = new User(data);
    await this._loadHatchery(data.name);

    this.startUpdates();
  }

  // removes the monster from the local hatchery object
  removeFromLocalHatchery(monsterId) {
    delete this._hatchery[monsterId];
  }

  // checks if the user has enough meat
  checkMeat(num) {
    if (num <= this.user.getMeat()) return true;
    return false;
  }

  async useMeat(num) {
    await this.user.useMeat(num);
    this.htmlMeat.textContent = `Meat: ${this.user.getMeat()}`;
  }

  // once the user has logged in, begin running _periodicUpdate
  startUpdates() {
    this.timeoutId = setTimeout(async () => {
      await this._periodicUpdate();
    }, TIMEOUT_INTERVAL);
  }

  // this function runs every TIMEOUT_INTERVAL milliseconds.
  // it loops through each monster in the hatchery, updating that monster's
  // satiety levels and hatch/evolve countdowns as needed.
  // it also increases the user's supply of meat.
  async _periodicUpdate() {
    // loop through all the monsters
    for (let monsterId of Object.keys(this._hatchery)) {
      await this._hatchery[monsterId].monsterUpdate();
    }
    // increase supply of meat
    await this.user.addMeat(MEAT_INCREASE);
    this.htmlMeat.textContent = `Meat: ${this.user.getMeat()}`;

    console.log("update!");

    // set up the next instance of _periodicUpdate()
    this.timeoutId = setTimeout(async () => {
      await this._periodicUpdate();
    }, TIMEOUT_INTERVAL);
  }

  // handle summoning a new egg
  async _handleSummon(event) {
    // updating backend
    let info = await Monster.summon(this.user.username, this._google);
    let thisMonster = new Monster(info, this);

    thisMonster.addToHtmlHatchery(); // updating html
    this._hatchery[thisMonster._id] = thisMonster; // updating local hatchery array
    console.log("summon!");
  }

  // handle abandoning Hatchery and starting anew
  async _handleAbandon(event) {
    if (window.confirm("Are you sure you want to abandon your hatchery and start anew? This will be irreversible, and your monsters will never come back.")) {
      // do nothing. let the rest of the function run
    } else {
      console.log("abandon aborted!");
      return;
    }
    console.log("abandon!");

    // update backend
    for (let monsterId of Object.keys(this._hatchery)) {
      await this._hatchery[monsterId].release();
    }

    this._hatchery = {}; // reset hatchery
  }

  // loads the hatchery after user logs in
  async _loadHatchery(name) {
    // updates meat counter
    this.htmlMeat.textContent = `Meat: ${this.user.getMeat()}`;
    // edit the title
    document.querySelector("#title").textContent = name + "'s Monster Hatchery";
    document.querySelector("#monsterhatchery").textContent = name + "'s Monster Hatchery";
    // make login page invisible
    document.querySelector("#welcome").classList.add("hidden");

    // make hatchery visible
    document.querySelector("#monsterhatchery").classList.remove("hidden");
    document.querySelector("#hatchery").classList.remove("hidden");

    // reset roster HTML
    let rosterElem = document.querySelector("#roster").children;
    for (let i = rosterElem.length-1; i > 0; i--) {
      rosterElem[i].remove();
    }

    // load all monsters
    let allMonsters = null;
    if (this._google) {
      // if user logged in through google, get monsters from /protected
      allMonsters = await apiRequest("GET", `/protected/roster`, null, window.API_KEY);
    } else {
      allMonsters = await apiRequest("GET", `/users/${this.user.username}/roster`);
    }
    this._hatchery = {}; // reset hatchery array
    for (let monster of allMonsters.roster) {
      let wrapped = new Monster(monster, this);
      wrapped.addToHtmlHatchery();
      this._hatchery[wrapped._id] = wrapped;
    }
  }

  // logs the user in
  async _makeLogin(username) {
    // if the input is blank, send an alert then do nothing
    if (username === "") {
      alert("Must enter a valid name!");
      return;
    }

    // get appropriate User instance
    let data = await User.loadOrCreate(username, username, false);
    this.user = new User(data);
    this._google = false;

    // _loadHatchery updates html based on info from backend
    await this._loadHatchery(data.name);
  }

  // handler for the login form
  async _onLoginSubmit(event) {
    event.preventDefault();
    let username = this._loginForm.username.value;
    await this._makeLogin(username);
    this.startUpdates(); // activates _periodicUpdate(), which updates monster statuses every minute
    this._loginForm.reset();
  }
}
