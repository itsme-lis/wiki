-# For the bubble equivalent in [[Cut the Rope 2]], see *[[Object:Balloon]]*.

::infobox
image: articles/Media/Object/Bubble_CTR_iOS.png
title: Bubble
Appearances: [[Cut The Rope]], [[Cut The Rope: Holiday Gift]], [[Cut the Rope: Experiments]], [[Cut the Rope: Time Travel]], [[Cut the Rope: Magic]]
Usage: Lifts objects after they get into the bubble.
[[Physics Object|Is a Physics Object?]]: No
::


**Bubbles** are [[Object]]s present throughout most games in the *[[Cut the Rope (franchise)|Cut the Rope Franchise]]*. In all of their appearances, they are able to lift the [[Candy]] and other small [[Physics Object]]s once they get into the bubble. Bubbles with objects inside can be popped by pressing on them.

# History
## In *[[Cut The Rope]]*
Bubbles make their first appearance in the series in Level [[Level:1-5 (Cut The Rope)|1-5]] in the first game. The level teaches the player how to make the [[Candy]] enter into the bubble, then right after teaches the player how to pop it. The level uses a `special` attribute in the [[Object:Tutorial Sign|Tutorial Sign]] and [[Object:Tutorial Text|Tutorial Text]] tags to make the tutorials for popping the bubble appear dynamically as the level progresses.

Bubbles on the PC version of the game float up slower and have less impulse/more friction, making them able to start rising sooner when the candy is dropped into them from above compared to the the Mobile version.

Bubbles travel with objects through [[Object:Hat|Hat]]s. Bubbles can be made in infinite amounts via being a part of a [[Object:Ghost|Ghost]] transformation roster.

## In *[[Cut The Rope: Holiday Gift]]*
Bubbles return in *Cut the Rope: Holiday Gift* in Level [[Level:1-3 (Cut The Rope: Holiday Gift)|1-3]], behaving ditto to their Cut The Rope appearance in the Mobile version.

## In *[[Cut the Rope: Experiments]]*
Bubbles appear in *Cut the Rope: Experiments* in Level [[Level:1-3 (Cut the Rope: Experiments)|1-3]], being the same as in Cut The Rope but with new interactions with the game elements unique to the game:
- [[Object:Rocket|Rocket]]s' and Bubbles' forces stack: The bubble drags the candy up while the rocket goes in its direction, creating mixed forces that can push the candy in various directions; this also depends on the Rocket's velocity.
- [[Object:Ants|Ants]] grabbing a bubbled candy pop the bubble.
- [[Object:Bamboo Chute|Bamboo Chute]]s shoot out the candy with the bubble, similarly to how Hats work with bubbles.

## In *[[Cut the Rope: Time Travel]]*
Bubbles appear in *Cut the Rope: Time Travel*. While they behave exactly the same as in previous games. First appearing in Level [[Level:1-5 (Cut the Rope: Time Travel)|1-5)]], they can now absorb new [[Physics Objects]] introduced in the game, those being the [[Chainsaw]], [[Object:Bomb]] and [[Object:Disco Ball|Disco Ball]]. The only difference in Bubbles' behaviours is that they now pop when the object inside of it mounts a [[Object:Rocket|Rocket]].

## In *[[Cut the Rope: Magic]]*
::msg
kind: todo
message: Add max size for circular log to still be able to enter a bubble.
::

After an absence in the [[Cut the Rope 2|previous entry in the franchise]], Bubbles return in *Cut the Rope Magic*, having different physics and a new sprite stylized for the game. They first appear in Level [[Level:2-4 (Cut the Rope: Magic)|2-4]]. Much like previously, they provide the ability to lift objects, not only Candy but also Circular [[Object:Wood]] pieces and [[Object:Shape Potion]]s. Their impulse/friction is similar to the one from the PC version of [[Cut The Rope]].

# Syntaxes & Attributes
Taken from the Cut the Rope Level XMLs:

| Name | Type | Description |
| -------- | ------- | :------- |
| `bubble` | Name | Object tag name. |
| `x` | Integer | X position attribute. (Positive X is right.) |
| `y` | Integer | Y position attribute. (Positive Y is down.) |

Example: `<bubble x="13" y="267" />` will put a bubble in a level at coordinates X: 13 and Y: 267 (counting from the top left corner from the screen).

# Trivia
- Bubbles are the first gameplay element introduced after the basic four ([[Object:Rope Hook|Rope Hook]]s, [[Object:Candy|Candy]], [[Object:Omnom|Star]], [[Object:Star|Star]]) in all games except for [[Cut the Rope: Magic]].
