# SeattleData
Using Seattle municipal gov open data to build a data vizualization app allowing users to learn more about their emergency services


<b>Setup</b>
- Ensure node.js and node package manager (NPM) are installed
- Run "npm install" in the root directory to set up node modules
- Run node server.js to launch a locally hosted version on port 3000


Basic Workflow
- User enters their address (or an address of a house/property they're interested in)
- (Selects a date range) - optional
- Submits query
- Is returned with
  - Last 20 incidents in the neighborhood
  -

Pseudo code
- Autocompletes the address as it is typed
- Verifies the address on Google
- Get ltlng coordinates from address
- Map ltlng against neighborhood geojson polygons, return correct neighborhood

In meantime, on server side code:
- run daily query of SOPA database, mapping against neighborhoods
- calculate # of incidents by type and neighborhoods
  -
- calculate city wide avg. (per neighborhood) by incident type
  -  total # of incidents (by type) / total # neighborhoods 
