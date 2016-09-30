#<h3> Data management application</h3>
  <span><p><h5>/</h5>Opening function that directs to index.html</p> <br> </span> 
  <span><p><h5>/api/help</h5>Print available functions </p> <br> </span> 
  <span><p><h5>/das_driver_all</h5>Takes the dataset name and checks in DAS if it's in there, if the dataset is stored in disk and if so - download the needed .root file for cmsRun to launch</p> <br> </span> 
  <span><p><h5>/das_driver_single</h5>Same as above, just does it with single dataset, could refactor to use the same function, but maybe laterz</p> <br> </span> 
  <span><p><h5>/delete_doc</h5>Sends a request to couchDB to delete the given document according to the _id var of the record</p> <br> </span> 
  <span><h5>/get_alca_matrix_value</h5><p>Downloads the autoAlca matrix from the Git repo and passes it to Angular controller which\n    updates the text field</p> <br> </span> 
  <span><p><h5>get_all_docs</h5>Used in saveDocs() function to get all docs and later for the object to be pushed in to the data list</p> <br> </span> 
  <span><p><h5>/get_skim_matrix_value</h5>Downloads the autoSkim matrix from the Git repo and passes it to Angular controller which updates the text field</p> <br> </span> 
  <span><p><h5>/load_data</h5>Communicates with the CouchDB and returns the object according to it's _id as a JSON</p> <br> </span> 
  <span><p><h5>/save_doc</h5>Puts a newly created object to the CouchDB</p> <br> </span> 
  <span><p><h5>submit_campaign</h5>Executes the submit button by updating the current campaign, creating/executing the script in get_submit_bash(). Logs of the process can be found in the WORK_DIR variable location and a log is also uploaded to the CouchDB together with the object</p> <br> </span> 
  <span><p><h5>/test_campaign</h5>Creates a bash script that will proceed with the config file generation and will run the cmsRun command without injecting it to request manager. Runs tests with all the datasets of the campaign and return jsons should be processed by the dataset name in controllers.js</p> <br> </span> 
  <span><p><h5>/update_file</h5>Gets the object from the browser and updates it in the CouchDB</p><br></span> 
#<h4> TO-DO list </h4>
Testing icon for three stages - not tested/suceeded/failed
DB in a new instance, not in Monika's dB
Config entry for Dev/Prod instances

