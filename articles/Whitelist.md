Inherited from another puzzle game developed by ZeptoLab, [Pudding Monsters](https://en.wikipedia.org/wiki/Pudding_Monsters), the **Whitelist**[^1] (also called **Object Whitelist** or any similar term) is a code feature in [[Game:Cut the Rope 2|*Cut the Rope 2*]] and [[Game:Cut the Rope： Time Travel|*Cut the Rope: Time Travel*]] that prevents certain [[Objects]] from being used in specific worlds of the games, often being tied to new mechanics being added to game levels with the games' progression. This makes modding in these games more difficult, often forcing modders to make custom levels in these 2 games in their last worlds, where most objects are available to use.

The whitelist only world-locks different `<tags>`, not objects with different `attributes=""`, which means certain objects and their variants are grouped (there is one exception to this rule; the flying platform for Future [[Object:Target|Om Nom]], which is hardcoded not to render in worlds other than [[Levels:The Future (Cut the Rope： Time Travel)|The Future]] and [[Levels:Parallel Universe (Cut the Rope： Time Travel)|Parallel Universe]]).

It is currently unknown why it was ever implemented, the leading theory being to save on performance when loading levels in these games.

Trying to put an object in a world where it is considered invalid will result in a game crash.

# Whitelists
::card
title: Note 
text: In the following tables, world names are represented by numbers (e.g. in *Cut the Rope 2* the number 4 corresponds to the world [[Levels:City Park (Cut the Rope 2)|City Park]]).
::
## [[Game:Cut the Rope： Time Travel|*Cut the Rope: Time Travel*]]

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

## [[Game:Cut the Rope 2|*Cut the Rope 2*]]
:: msg 
kind: todo 
message: Add the [[Game:Cut the Rope 2|*Cut the Rope 2*]] whitelist.
::

[^1]: Unofficial name, as dubbed by the Cut the Rope Home Community.
[^2]: In *Cut the Rope: Time Travel*, spike and bouncer sizes are handled via different object tags, instead of using attributes like the previous games.
