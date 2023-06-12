CS193X Final Project
====================

Project Title: Monster Hatchery

Overview
--------
Welcome to the Monster Hatchery!
Here, you can summon Monster eggs. After some time, they will hatch into baby monsters.
You can either feed, release, or halt evolution of these monsters. After enough time and
enough food in their bellies, they will evolve!

Running
-------
Simply run `npm install` and `npm start`.
Do we need to load data from init_db.mongodb? Yes. This is just to initialize the correct collections.

Features
--------
LOGIN FEATURES
    - Name login: This will create a new user with the provided name. You can revisit the same Hatchery
        by using that same name, but so can everyone else.
    - Google login: This will create a new user with information from the provided Google account. You can
        revisit the same Hatchery by logging in with that same account, adding a layer protection to your
        Hatchery.
HATCHERY FEATURES
    - Summon monster egg: This will summon a random egg with a randomized countdown.
    - Abandon Hatchery: This will get rid of every Monster in your Hatchery so you can start anew.
    - Change name: This will change your name. The change will be reflected in the title of the Hatchery.
MONSTER FEATURES
    - Hatch: Once a monster egg is ready to hatch, you can hatch it into a baby monster.
    - Feed: This will feed the monster and increase its satiety level. If the monster is ready to evolve, bringing
        up its satiety level will help trigger its evolution. However, the monster cannot be fed if the player does
        not have enough meat. Once a monster is successfully fed, the player's meat count will decrease.
    - Release: This will release a monster from your Hatchery.
    - Halt evolution: This will prevent a monster from evolving, even if it is ready to evolve and has the right
        satiety level.
A player's count of meat will increase as the player idles on the Hatchery page.

Collaboration and libraries
---------------------------
I utilized the Google authentication guide posted on the project spec to implement Google login.
For monster_init_base.js from where the randomized monster names come from, I used
this website (https://www.fantasynamegenerators.com/dragon-names.php) to help me generate names.
Everything else in the project was created by me!

Anything else?
-------------
Loved this course so much! Thank you Michael and Sam (for feedback on my proposal) and TAs!
