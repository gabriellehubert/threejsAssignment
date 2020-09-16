# threejsAssignment
This assignment was a challenge to create a visualization using the ThreeJS library for sample data representing basic packet traffic information.

## Usage Guide
1. Download entire repository to your computer
2. Open your favourite web browser
3. Navigate to the directory containing the newly downloaded repository
4. Open visualization.html
5. Use buttons at the top of your browser to visualize the distribution of packets between IP addresses
    - Back: Go back to previous packet transfer
    - Forward: Show next packet transfer
    - Skip: Show all packet transfers at once
   
## Files
- js
  - three.js: from https://threejs.org/
  - visualization.js: script and additional modules to create the packet traffic visualization
- css
  - visualization.css
- tutorial.html: completed tutorial from https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene
- visualization.html: the packet traffic visualization template

## Design Decisions 
- The unique IP addresses are organized around the circumference of a circle, in order to easily visualize connections (or packet transfers) between them.
- Packet transfers are represented by directed arrows, with the colour representing the protocol used. 
- Forward and Backward buttons are used in order to step forward and backwards in time.
- The Skip button allows the final visualization to be viewed without stepping forward through all transfers. 
- Two renderers were used for this visualization: WebGL and CSS2D. The CSS2D renderer is used for the IP address labels; this option allowed the labels to be viewed from any angle.
- A table at the bottom of the window shows details not explicitly included in the visualization, including time and length of the packet.
- Two additional modules were used outside of the core three.JS library: CSS2DRenderer.js for the rendering the labels, and TrackballControls.js for the controls. Since this visualizatation is developed as a local application, issues arised when attempting to import them. Instead, the modules were modified slightly and pasted into visualizatation.js.

## Future Improvements
- Currently, there is no way to identify the "current" packet transfer arrow in the visualization. Ideally, the "current" arrow could be highlighted; this would involve using a different material which uses a mesh that can be modified to have a glowing effect.
- There is no way to show the density of packet transfers; if multiple transfers occur between two IP addresses, they appear as a single line. Adding arcs to the lines could help visualize transfer density.
- Ideally, information about a packet transfer could be shown when the user hovers over the line, using tooltips or a three.JS alternative solution. 
- This visualization uses data that is hardcoded into visualization.js. Ideally, this is loaded from a different file, and the user has the ability to load their own JSON file. Changes would have to made in order to accomadate different sizes of files, such as dynamically allocating the radius of the circle based on the number of unique IP addresses. Colours for each unique protocol would have to be dynamically assigned as well. 
- There is an error that occurs when scrolling in and out of the visualization, which does not appear to affect functionality. It appears that the TrackballControls don't want to play nicely with Chrome. The following message is the console error:
  - Unable to preventDefault inside passive event listener due to target being treated as passive. See https://www.chromestatus.com/features/6662647093133312


