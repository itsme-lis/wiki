::card info
title: Info
text: This Original Guide is from the Official Cut the Rope: DX __GitHub Wiki__ Guide by yell0wsuit.
::

This is a Beginner-friendly Guide to help you build Cut the Rope: DX from source On Windows.
It walks you through Cloning the Repository, Setting up the required Tools, and Compiling the Game step by step.
No prior experience with .NET or GitHub is required, just some Patience and Disk Space 💾.

::card warning
title: Note
text: We do not provide Support for Custom Builds. If you choose to Build from the Source, you are on your own.
::

# __Guide__

## **Prerequisites**

- **💾 At least 5-10 GB of free storage**
- **⏳ 30+ minutes of your time**
- **Install GitHub Desktop: **
[Download GitHub Desktop | GitHub Desktop](https://desktop.github.com/download/)
::media left
url: ghdesktophint.png
caption: GitHub Desktop for Windows Download Button Either .EXE or .MSI
::
::card
title: Did You Know?
text: GitHub Desktop Requiring you to sign-in with your GitHub Account. If you don't wanna sign-in, you could use a “git clone” Command from CMD to Clone The Repository but with a few Limitation, make sure you already Install “Git for Windows”.
::
- **Install the .NET SDK: **
[Download .NET (Linux, macOS, and Windows) | .NET](https://dotnet.microsoft.com/en-us/download)
::media left
url: dotnetsdkhint.png
caption: .NET 10.0 SDK Download Button for Windows (x64 Only)
::
::card
title: Before you Proceed
text: This Guide is only for Users with Windows 10 x64 or later,Vulkan GPU Support is required to proceed.If you don't know whether your GPU supports Vulkan or not, please go to the following Article: PRIMEMORI
::

## Getting the Source Code

- Go to the Repository: 
[yell0wsuit/cuttherope-dx: Cut the Rope: DX, a fan-made enhancement of the PC version of Cut the Rope.](https://github.com/yell0wsuit/cuttherope-dx/)
::media left
url: ctrdxsc.png
caption: Cut the Rope: DX GitHub Page by yell0wsuit
::
- Click the Green “**Code**” Button, then select “**Open with GitHub Desktop**”.
::media left
url: openwghdesktop.png
caption: Open and Clone with GitHub Desktop
::
- If your Browser asks “*This site is trying to open GitHub Desktop*”, click Open.
::media left
url: ghdesktopbrowserconfirm.png
caption: Open with GitHub Desktop Confirmation window on Browser
::
- GitHub Desktop will Open and Prompt you to Choose a Location to Clone the Repository. Select any folder you like, then click Clone.
::media left
url: clonerepo.png
caption: Setup Clone Location
::
- The Cloning Process may take a while, depending on your Internet and Storage Speed.
::media left
url: cloneprocess.png
caption: Cloning Process
::
- Once Cloning is Complete, you should see the Repository listed in GitHub Desktop.
::media left
url: ctrdxonghdesktop.png
caption: Cut the Rope: DX Source on GitHub Desktop
::

## Compiling the Game

- In GitHub Desktop, Right-click “**Current Repository**”.
::media left
url: rccurrentrepo.png
caption: Current Repository
::
- On Windows, Click “*Open in Command Prompt* or *Open in Terminal*”.
::media left
url: openwcmd.png
caption: Open in Command Prompt or Terminal
::
- A CMD or Terminal window will open. Run the following Command:
```C#
dotnet build -f net10.0
```
::left media
url: buildcommand.png
caption: Command on CMD
::
- The first build may take some time. Wait until you see “**Build succeeded**”.
::left media
url: compillingprocess.png
caption: Compiling Process on CMD
::
::media left
url: compillingsuccess.png
caption: Compiling Succeeded
::
::card
title: Tips
text: You may notice there was an error while compiling,try to running the Command again on the same CMD window.
::
- Return to GitHub Desktop, Right-click “**Current repository**”, and select “Show in Explorer” On Windows.
::media left
url: showonexplorer.png
caption: Show on Explorer
::
- Navigate through the following folders:
```Plain text
CutTheRope\bin\Debug\net10.0\
```
::media left
url: ctrdxdirectory.png
caption: Executable folder Directory
::
- You will find the **CutTheRope-DX executable** ready to run 🎉

# __Testing new Features__

To try out features that are still in development, click “**Current branch**” and select any branch listed under “**Recent branches**” or “**Other branches**”.
::media left
url: dxbranch.png
caption: Cut the Rope: DX Branch for Testing New Features
::
After switching branches, rebuild the game by following the “Compiling the game” section.

# __Updating the Source__

When new commits are pushed to the repository, the “**Fetch origin**” button will change to “**Pull origin**”. Click it to download the latest updates.You can also click “**Fetch origin**” manually at any time to check for new changes.
::media left
url: pullorigin.png
caption: Pull Origin When New Changes and Updates on the Repository
::
