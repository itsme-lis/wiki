::card info
Title: Info
Text: This Original Guide is from the Official Cut the Rope: DX __GitHub Wiki__ Guide by yell0wsuit.
::

This is a Beginner-friendly Guide to help you build Cut the Rope: DX from source On Windows.

It walks you through Cloning the Repository, Setting up the required Tools, and Compiling the Game step by step.

No prior experience with .NET or GitHub is required, just some Patience and Disk Space 💾.

::card warning
Title: Note
Text: We do not provide Support for Custom Builds. If you choose to Build from the Source, you are on your own.
::

## __Guide__

### **Prerequisites**

- **💾 At least 5-10 GB of free storage**
- **⏳ 30+ minutes of your time**
- **Install GitHub Desktop: **
[Download GitHub Desktop | GitHub Desktop](https://desktop.github.com/download/)
    
        
            
            
            
            
        
        
            
            
        
        GitHub Desktop Download Button Either .EXE or .MSI

    
        
            
            
            
        
         Did You Know?
        GitHub Desktop Requiring you to sign-in with your GitHub Account.If you don't wanna sign-in, you could use a “git clone” Command from CMD to Clone The Repository but with a few Limitation, make sure you already Install “Git for Windows”.
    

- **Install the .NET SDK: **
[Download .NET (Linux, macOS, and Windows) | .NET](https://dotnet.microsoft.com/en-us/download)

    
        
            
            
            
            
        
        
            
            
        
        .NET 10.0 SDK Download Button (64 Bit Only)
    

    
        
            
            
            
        
         Before you Proceed
        This Guide is only for Users with Windows 10 x64 or later,Vulkan GPU Support is required to proceed.If you don't know whether your GPU supports Vulkan or not, please go to the following Article: PRIMEMORI

### Getting the Source Code

- Go to the Repository: 
[yell0wsuit/cuttherope-dx: Cut the Rope: DX, a fan-made enhancement of the PC version of Cut the Rope.](https://github.com/yell0wsuit/cuttherope-dx/)
    
        
            
            
            
            
        
        
            
            
        
        Cut the Rope: DX GitHub Page by yell0wsuit
- Click the Green “**Code**” Button, then select “**Open with GitHub Desktop**”.
    
        
            
            
            
            
        
        
            
            
        
        Open and Clone with GitHub Desktop
- If your Browser asks “*This site is trying to open GitHub Desktop*”, click Open.
    
        
            
            
            
            
        
        
            
            
        
        Open with GitHub Desktop Confirmation window on Browser
- GitHub Desktop will Open and Prompt you to Choose a Location to Clone the Repository. Select any folder you like, then click Clone.
    
        
            
            
            
            
        
        
            
            
        
        Setup Clone Location
- The Cloning Process may take a while, depending on your Internet and Storage Speed.
    
        
            
            
            
            
        
        
            
            
        
        Cloning Process
- Once Cloning is Complete, you should see the Repository listed in GitHub Desktop.
    
        
            
            
            
            
        
        
            
            
        
        Cut the Rope: DX Source on GitHub Desktop

### Compiling the Game

- In GitHub Desktop, Right-click “**Current Repository**”.
    
        
            
            
            
            
        
        
            
            
        
        Current Repository
- On Windows, Click “*Open in Command Prompt* or *Open in Terminal*”.
    
        
            
            
            
            
        
        
            
            
        
        Open in Command Prompt or Terminal
- A CMD or Terminal window will open. Run the following Command:Plain textJavaScriptTypeScriptHTMLCSSJSONMarkdownPythonJavaCC++C#PHPRubyGoRustLuaBashSQLYAMLCtrl+Enter to exitdotnet build -f net10.0
    
        
            
            
            
            
        
        
            
            
        
        Command on CMD
- The first build may take some time. Wait until you see “**Build succeeded**”.
    
        
            
            
            
            
        
        
            
            
        
        Compiling Process on CMD
    

    
        
            
            
            
            
        
        
            
            
        
        Compiling Succeeded
    

    
        
            
            
            
        
         Tips
        You may notice there was an error while compiling,try to running the Command again on the same CMD window.
- Return to GitHub Desktop, Right-click “**Current repository**”, and select “Show in Explorer” On Windows.
    
        
            
            
            
            
        
        
            
            
        
        Show on Explorer
- Navigate through the following folders:​Plain textJavaScriptTypeScriptHTMLCSSJSONMarkdownPythonJavaCC++C#PHPRubyGoRustLuaBashSQLYAMLCtrl+Enter to exitCutTheRope\bin\Debug\net10.0\
    
        
            
            
            
            
        
        
            
            
        
        Executable folder Directory
- You will find the **CutTheRope-DX executable** ready to run 🎉

## __Testing new Features__

To try out features that are still in development, click “**Current branch**” and select any branch listed under “**Recent branches**” or “**Other branches**”.

After switching branches, rebuild the game by following the “Compiling the game” section.__Updating the Source__When new commits are pushed to the repository, the “**Fetch origin**” button will change to “**Pull origin**”. Click it to download the latest updates.You can also click “**Fetch origin**” manually at any time to check for new changes.