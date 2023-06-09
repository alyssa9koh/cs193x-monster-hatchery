import apiRequest from "./apirequest.js";

export default class User {
  // Returns a User instance, creating the user if necessary.
  static async loadOrCreate(username, name, google) {
    if (google) {
      // if the user is logged in through google, then get user from /protected
      let data = await apiRequest("GET", `/protected/user`, null, window.API_KEY);
      return data;
    }

    try {
      // get user, then return user
      let data = await apiRequest("GET", `/users/${username}`);
      return data;
    } catch (error) {
      // create user
      let data = await apiRequest("POST", "/users", { "username": username, "name": name });
      return data;
    }
  }

  // data is the user object from the API.
  constructor(data) {
    // update local variables
    this.username = data.username;
    this.user = data.user;
    this.google = data.google;
    this.meat = data.meat;

    // handlers for name change form
    this._nameForm = document.querySelector("#nameForm");
    this._onNameSubmit = this._onNameSubmit.bind(this);
    this._nameForm.addEventListener("submit", this._onNameSubmit);
  }

  // Increases how much meat the user has.
  async addMeat(num) {
    this.meat += num;

    // update backend
    if (this.google) {
      await apiRequest("PATCH", `/protected/user`, { "meat": this.meat }, window.API_KEY);
    } else {
      await apiRequest("PATCH", `/users/${this.username}`, { "meat": this.meat });
    }
  }

  // Returns the amount of meat the user has.
  // Allows the app to display the correct amount of meat.
  getMeat() {
    return this.meat;
  }

  // Consumes meat.
  async useMeat(num) {
    this.meat -= num;

    // update backend
    if (this.google) {
      await apiRequest("PATCH", `/protected/user`, { "meat": this.meat }, window.API_KEY);
    } else {
      await apiRequest("PATCH", `/users/${this.username}`, { "meat": this.meat });
    }
  }

  async _changeName(name) {
    // edit the title
    document.querySelector("#title").textContent = name + "'s Monster Hatchery";
    document.querySelector("#monsterhatchery").textContent = name + "'s Monster Hatchery";

    // update backend
    if (this.google) {
      await apiRequest("PATCH", `/protected/user`, { "name": name }, window.API_KEY);
    } else {
      await apiRequest("PATCH", `/users/${this.username}`, { "name": name });
    }
  }

  async _onNameSubmit(event) {
    event.preventDefault();
    let name = this._nameForm.name.value;
    await this._changeName(name);
    this._nameForm.reset();
  }
}
