Inherited from another puzzle game developed by ZeptoLab, [Pudding Monsters](https://en.wikipedia.org/wiki/Pudding_Monsters), the **Whitelist**[^1] (also called **Object Whitelist** or any similar term) is a code feature in *[[Cut the Rope: 2]]* and *[[Cut the Rope: Time Travel]]* that prevents certain [[Objects]] from being used in specific worlds of the games, often being tied to new mechanics being added to game levels with the games' progression. This makes modding in these games more difficult, often forcing modders to make custom levels in these 2 games in their last worlds, where most objects are available to use.

The whitelist only worldlocks different `<tags>`, not objects with different `attributes=""`, which means certain objects and their variants are grouped (there is one exception to this rule, being the flying platform for Future [[Om Nom]], which is hardcoded not to render in world other than [[The Future]] and [[Parallel Universe]]).

It is currently unknown why it was ever implemented, the leading theory being to save on performance when loading levels in these *Cut the Rope* games.

Trying to put an object in a world where it's considered invalid results in a game crash.

# Whitelists
::card
title: Note 
text: In the following tables, world names are represented by numbers (e.g. in *Cut the Rope 2* the number 4 corresponds to the world [[City Park]]).
::
## In *Cut the Rope: Time Travel*

| Object | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `target` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `candy` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `grab` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `star` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `bubble` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `axe` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `pauseSwitcher` | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `spike1`[^2] | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `spike2`[^2] | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `spike3`[^2] | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `spike4`[^2] | | | | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `pump` | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `bomb` | | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `bouncer1`[^2] | | | |  |  | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `bouncer2`[^2] | | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `rocket` | | | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `shieldTrigger` | | | | | ✔ | | | | | | | |
| `sock` | | | | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `clock` | | | | | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `discoBall` | | | | | | | ✔ |  |  | ✔ | ✔ | ✔ |
| `laser` | | | | | | | ✔ |  |  | ✔ | ✔ | ✔ |
| `fan` | | | | | | | | | ✔ | | | ✔ |
| `p_magnetSwitcher` | | | | | | | | | | ✔ | | ✔ |

## In *Cut the Rope: 2*
:: msg 
kind: todo 
message: Add the *Cut the Rope 2* whitelist.
::

[^1]: Unofficial name, as dubbed by the Cut the Rope Home Community.
[^2]: Different spike and bouncer sizes in *Cut the Rope: Time Travel* are handled via different object tags, instead of attributes like in the previous games.
