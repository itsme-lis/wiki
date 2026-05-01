-# For the equivalent object in [[Game:Cut the Rope 2|*Cut the Rope 2*]], see [[Object:Balloon|Balloon]].

:: card
title: Rewrite in progress
text: This article is currently in the process of being rewritten and does not contain all of the needed information the previous version does. [[Object:Bubble (Old)|You can view the older version here.]]
::

::infobox
title: Bubble
image: articles/Media/Object/Bubble_CTR_iOS.png
Appearances: [[Game:Cut the Rope|*Cut the Rope*]], [[Game:Cut the Rope： Holiday Gift|*Cut the Rope: Holiday Gift*]], [[Game: Cut the Rope： Experiments|*Cut the Rope: Experiments*]], [[Game:Cut the Rope： Time Travel|*Cut the Rope: Time Travel*]], [[Game:Cut the Rope： Triple Treat|*Cut the Rope: Triple Treat*]], [[Game:Cut the Rope： Magic|*Cut the Rope: Magic*]], [[Game:Cut the Rope Remastered|*Cut the Rope Remastered*]], [[Game:Cut the Rope Daily|*Cut the Rope Daily*]], [[Game:Cut the Rope： Origins|*Cut the Rope: Origins*]]
Functionality: Lifts an object once it enters the Bubble.
Object Types: Static, Interactive
::

**Bubbles** are [[Objects]] present throughout most games in the [[Cut the Rope Franchise|Cut the Rope franchise]]. In all of their appearances, they are able to lift [[Object:Candy|Candies]] and other supported small Physics-based objects that are inside of the Bubbles. Bubbles with objects inside can be popped by pressing on them.

# History
## [[Games:Cut the Rope|*Cut the Rope*]]
Bubbles make their first appearance in [[Levels:Cardboard Box (Cut the Rope)|Level 1-5]]. This level teaches players two things; how to make a [[Object:Candy|Candy]] enter the Bubble, and how to pop a Bubble.

Objects inside of Bubbles will travel with them when they go through [[Object:Magic Hat|Magic Hats]].

Bubbles can be produced in infinite amounts if they are part of the transformation roster of a [[Object:Ghost|Ghost]].

If the object inside of a Bubble breaks, the Bubble will pop.

## [[Game:Cut the Rope： Holiday Gift|*Cut the Rope: Holiday Gift*]]
Bubbles return starting with [[Levels:Holiday Gift (Cut the Rope： Holiday Gift)|Level 1-3]], behaving the same way they did in the previous game.

## [[Game: Cut the Rope： Experiments|*Cut the Rope: Experiments*]]
:: msg
kind: todo
message: Check Snails and Water.
::

Bubbles start appearing in [[Levels:Getting Started (Cut the Rope： Experiments)|Level 1-3]]. They behave the same way they did in the previous two games, and have new interactions for objects and features introduced in this game.
- The forces of [[Object:Rocket|Rockets]] and Bubbles stack. While the rocket propels the object carried by it, the Bubble continues to lift the object upwards, creating mixed forces that can push the object in different directions depending on the velocity of the Rocket.
- A Bubble containing a [[Object:Candy|Candy]] will pop if it is grabbed by a [[Object:Robotic Arm|Robotic Arm]] or a trail of [[Object:Ants|Ants]].
- Similar to how Bubbles interact with [[Object:Magic Hat|Magic Hats]], objects will stay in Bubbles shot out of [[Object:Bamboo Chute|Bamboo Chutes]].

## [[Game:Cut the Rope： Time Travel|*Cut the Rope: Time Travel*]]
Bubbles start appearing in [[Levels:The Middle Ages (Cut the Rope： Time Travel)|Level 1-5]]. They behave nearly the same way they did in the previous games, and support three Physics-based objects introduced in this game; [[Object:Blades|Blades]], [[Object:Bomb|Bombs]] and [[Object:Disco Ball|Disco Balls]].
The only difference in their behavior is that a Bubble will pop when the object contained inside of it is mounting a [[Object:Rocket|Rocket]].

## [[Game:Cut the Rope： Magic|*Cut the Rope: Magic*]]
:: msg
kind: todo
message: Add an image for the new design.
Add the maximum size a circular log can enter a Bubble.
::

After being absent from the [[Game:Cut the Rope 2|previous main entry in the franchise]], Bubbles return in this game with new physics and an updated design that matches the art style of the rest of the game. They first appear in [[Levels:Mushroom Forest (Cut the Rope： Magic)|Level 2-4]]. Like in previous games, they can lift supported small Physics-based objects that are inside of the Bubbles, those being [[Object:Candy|Candies]], [[Object:Wood|Circular Wood]] pieces, and [[Object:Shape Potions|Shape Potions]]. Their impulse and friction is similar to the PC version of [[Game:Cut the Rope|*Cut the Rope*]].

## [[Game:Cut the Rope： H5DX|*Cut the Rope: H5DX*]]
:: msg
kind: todo
message: Write this section.
::

## [[Game:Cut the Rope： DX|*Cut the Rope: DX*]]
:: msg
kind: todo
message: Write this section.
Document any new interactions.
::

# Technical Details
:: msg
kind: todo
message: Add sections for other games requiring technical details.
::

## [[Games:Cut the Rope|*Cut the Rope*]]
:: msg
kind: todo
message: Write this section.
Document the PC physics.
::

## [[Game:Cut the Rope： DX|*Cut the Rope: DX*]]
:: msg
kind: todo
message: Write this section.
Document the PC physics.
Check Experiments objects.
::

# Formatting and Parameters
:: card
title: Note
text: This section is currently for XML-based games only.
::

A Bubble is a simple object and only contains two parameters. In every game, the name of the object is `bubble`.

| Name |  Type   |                       Description                       |
| :--- |   ---   |                           ---                           |
| `x`  | Integer | The X position of the object. Positive values go right. |
| `y`  | Integer |  The Y position of the object. Positive values go down. |
