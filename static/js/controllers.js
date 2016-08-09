var myApp = angular.module('myApp', ['ui.bootstrap']);
var loader = angular.module('loader', ['angular-loading-bar']);
myApp.controller('myAppCtrl', function ($scope, $http, $location) {


  $scope.data = { 
                  "_id" : "CampaignName", 
                  "CMSSW":"CMSSW_7_4_0_pre6", 
                  "GT": "GT", 
                  "era":"2012A", 
                  "prio": 79000, 
                  "req":{}, 
                  "transient_output" : "[]"
                };
  $scope.checkAll = {reco : false, skim : false, mini :false};
  $scope.inTheList;
  $scope.list = [];

  $scope.working_on = false;
  $scope.alertMsg = {error : false, msg : "", show : false};
  $scope.is_tested = false;

  $scope.doc = {};
  $scope.check = {};
  $scope.drive = {};
  $scope.allOpt = {"Default" : {}};
  $scope.defCon = {};
  $scope.recoOpt = {
                    "steps" : "steps",
                    "conditions": "conditions",
                    "n":"n" 
                    };
  $scope.skimOpt = {
                  "steps" : "steps",
                  "conditions": "conditions", 
                  "skimoption": "skimoption",
                  "n":"n" 
                  };
  $scope.miniOpt = {
                  "steps": "steps", 
                  "conditions": "conditions",
                  "n":"n" 
                  };
  $scope.defOpt = {"reco" : $scope.recoOpt, "skim" : $scope.skimOpt, "mini" : $scope.miniOpt};
  $scope.jsons = {
                    "alca" : {},
                    "skim" : {},
                    "lumi" : {}
                  };

  //=============Actions with datasets===========//
  $scope.addReq = function(name)
  {
    console.log("addReq: " + name);   
    if (!(name in $scope.data['req'])){
      name = name || "NewDataSet";

      //add to all sets
      $scope.data['req'][name] = {"id" : name, "action" : {}};
      $scope.check[name] = {"reco" : false, "skim" : false, "mini" : false,"recoUnscheduled":false,"skimUnscheduled":false,"miniUnscheduled":false};      
      $scope.drive[name] = {};
      $scope.allOpt[name] = {};
      $scope.data['req'][name]['prio'] = $scope.data['prio'];
      $scope.data['req'][name]['transient_output'] = $scope.data['transient_output'];
      
      //go through every action
      for (key in $scope.check[name]){
        $scope.drive[name][key] = {};

        if ($scope.checkAll[key]){
          //console.log("checkAll key: " + key);       
          $scope.check[name][key] = true;
          $scope.checkChange(name, key);
        }

        $scope.checkAlca(name);
        $scope.checkSkim(name);
      }
    }else{
      alert("Dataset name already exists");
    }
  };

  $scope.removeReq = function(name)
  {   
    if ((name in $scope.data['req'])){
      delete $scope.data['req'][name];
      delete $scope.drive[name];
    }  
  };

  $scope.addExtra = function(ds, action, name)
  {   
    if (name == undefined){
      alert("No extra name");
    } else{
      $scope.allOpt[ds][action][name] = name;
    }
  };

  $scope.removeExtra = function(ds, action, name)
  {
    console.log("removeExtra: " + ds + "; " + action + "; " + name + "; ");  
    if ($scope.data['req'][ds]['action'][action] != undefined && (name in $scope.data['req'][ds]['action'][action])){
      delete $scope.data['req'][ds]['action'][action][name];
    }
    if ($scope.allOpt[ds][action][name] != undefined && (name in $scope.allOpt[ds][action])){
      delete $scope.allOpt[ds][action][name];
    } 
  };

  $scope.addDefExtra = function(ds, action, name)
  {   
    if (name == undefined){
      alert("No extra name");
    } else{
      for (dataset in $scope.allOpt){
        if ($scope.allOpt[dataset][action] == undefined){
          $scope.allOpt[dataset][action] = {};
        }
        $scope.allOpt[dataset][action][name] = name;
      }
    }
  };

  $scope.removeDefExtra = function(ds, action, name)
  {
    for (dataset in $scope.allOpt){
      if (dataset != 'Default'){
        if ($scope.data['req'][dataset]['action'][action] != undefined && (name in $scope.data['req'][dataset]['action'][action])){
          delete $scope.data['req'][dataset]['action'][action][name];
        }
      }else{
        if ($scope.defCon[action] != undefined && (name in $scope.defCon[action])){
          delete $scope.defCon[action][name];
        }
      }
      if ($scope.allOpt[dataset][action] != undefined && $scope.allOpt[dataset][action][name] != undefined && (name in $scope.allOpt[dataset][action])){
        delete $scope.allOpt[dataset][action][name];
      }
    }
  };

  //================Helper methods==================//

  $scope.checkAllChange = function(action)
  {
    //true to false
    if ($scope.checkAll[action] == false){
      for (dataset in $scope.data['req']){
        delete $scope.data['req'][dataset]['action'][action];
        $scope.allOpt[dataset][action] = false;
        $scope.check[dataset][action] = false;
      }
      delete $scope.defCon[action];
    }

    //false to true
    if ($scope.checkAll[action] == true){
      if ($scope.allOpt['Default'][action] == undefined){
        $scope.allOpt['Default'][action] = JSON.parse(JSON.stringify($scope.defOpt[action]));
      }        

      for (dataset in $scope.data['req']){
        if ($scope.check[dataset][action] == true){
          $scope.cleanDatasetInfo(dataset, action);
        }
        $scope.check[dataset][action] = true;
        $scope.addDatasetInfo(dataset,action);

        if (action == 'skim'){
          $scope.checkSkim(dataset);
        }
      }

      if ($scope.defCon.reco == undefined){
        $scope.defCon.reco = {};
      }
      $scope.defCon.reco.conditions = $scope.data.GT; 
      if ($scope.defCon.skim == undefined){
        $scope.defCon.skim = {};
      }
      $scope.defCon.skim.conditions = $scope.data.GT;
      if ($scope.defCon.mini == undefined){
        $scope.defCon.mini = {};
      }
      $scope.defCon.mini.conditions = $scope.data.GT;

      $scope.formDriver('Default', action);
    }   
  };

  $scope.checkChange = function(ds, action)
  {
    console.log("check change: " + ds + "; " + action);

    //if action turns to false
    if ($scope.check[ds][action] == false){
      $scope.cleanDatasetInfo(ds, action)
    }
    //if action turns true
    if ($scope.check[ds][action] == true){
      $scope.addDatasetInfo(ds, action);
      $scope.formDriver(ds, action);
    }  
  };

  $scope.priorityChange = function(priority)
  {

    for (ds in $scope.data['req']){
      console.log(ds + " " + priority);
      $scope.data['req'][ds]['prio'] = priority;
    }
  };

  $scope.transientChange = function(transient_output)
  {

    for (ds in $scope.data['req']){
      console.log(ds + " " + transient_output);
      $scope.data['req'][ds]['transient_output'] = transient_output;
    }
  };

  $scope.cleanDrive = function (){
    for (ds in $scope.drive){
      for (action in $scope.drive[ds]){
        if ($scope.check[ds] != undefined && $scope.check[ds][action] == false){
          $scope.drive[ds][action] = "";
        }
      }
    }
  };

  $scope.checkSkim = function(ds)
  {
      if ($scope.jsons.skim[ds.split("/")[1]] == undefined && $scope.check[ds].skim == true){
        $scope.check[ds].skim = false;
        if ('skim' in $scope.data['req'][ds]['action']){
          delete $scope.data['req'][ds]['action']['skim'];
        }
      }

      if ($scope.checkAll['skim'] == true && $scope.jsons.skim[ds.split("/")[1]] != undefined){
        $scope.check[ds].skim = true;
      }    
  };

  $scope.checkAlca = function(ds)
  {
    if ($scope.defCon['reco'] != undefined){

      temp = $scope.data['req'][ds]['action']['reco']['steps'];

      if (temp != undefined && /ALCA:/.test($scope.defCon['reco']['steps']) && $scope.jsons.alca[ds.split("/")[1]] == undefined){
        str = $scope.data['req'][ds]['action']['reco']['steps'].split('ALCA:');
        $scope.data['req'][ds]['action']['reco']['steps'] = "";
        if(str[0] != undefined){
          $scope.data['req'][ds]['action']['reco']['steps'] += str[0];
        }
        if (str[1] != undefined){
          $scope.data['req'][ds]['action']['reco']['steps'] += str[1];
        }
        $scope.data['req'][ds]['action']['reco']['steps'].replace(/,,/, ",");
      }
    }
  };

  $scope.formDriver = function(ds, action)
  {
    var isDefault = ((ds == 'Default') ? true : false);
    //console.log("formDriver: " + ds + "; " + action + "; ");

    if (isDefault && $scope.drive[ds] == undefined){
        $scope.drive[ds] = {};
    }

    if (!isDefault){
      if ($scope.data['req'][ds]['action'][action] != undefined) {
        var temp = JSON.parse(JSON.stringify($scope.data['req'][ds]['action'][action]));
      } else {
        var temp = {};
      }
    } else{
      if ($scope.defCon[action] != undefined){
        var temp = JSON.parse(JSON.stringify($scope.defCon[action]));
      }else {
        var temp = {};
      }
    }

    if (action == 'reco'){
        $scope.drive[ds][action] = "";
        $scope.drive[ds][action] = "cmsDriver.py reco";
        
      if (!isDefault){

        if ($scope.defCon['reco'] != undefined && /ALCA:/.test($scope.defCon['reco']['steps']) && $scope.jsons.alca[ds.split("/")[1]] != undefined){
          str = $scope.data['req'][ds]['action'][action]['steps'].split('ALCA:');
          $scope.data['req'][ds]['action'][action]['steps'] = "";
          temp['steps'] = "";

          if (str[0] != undefined){
            $scope.data['req'][ds]['action'][action]['steps'] += str[0];
            temp['steps'] += str[0];
          }

          $scope.data['req'][ds]['action'][action]['steps'] += "ALCA:";
          temp['steps'] += "ALCA:";
          temp['steps'] += $scope.jsons.alca[ds.split("/")[1]];

          if (str[1] != undefined){
            $scope.data['req'][ds]['action'][action]['steps'] += str[1];
            temp['steps'] += str[1];
          }

        }
        if (temp['steps'] != undefined){
          $scope.data['req'][ds]['action']['reco']['steps'] = $scope.data['req'][ds]['action']['reco']['steps'].replace(/,,/, ",");
          temp['steps'] = temp['steps'].replace(/,,/, ",");
        }
      }
        
        $scope.drive[ds][action] += temp['steps'  ] ? " -s " + (temp['steps'] || "") : "";
        delete temp['steps'];
        $scope.drive[ds][action] += temp['n'  ] ? " -n " + (temp['n'] || "") : "";
        delete temp['n'];
        $scope.drive[ds][action] += temp['conditions'] ? " --conditions " + (temp['conditions'] || "") : "";
        delete temp['conditions'];
        $scope.drive[ds][action] += temp['eventcontent'] ? " --eventcontent " + (temp['eventcontent'] || "") : "";
        delete temp['eventcontent'];        
        $scope.drive[ds][action] += temp['datatier'] ? " --datatier " + (temp['datatier'] || "") : "";
        delete temp['datatier'];
        $scope.drive[ds][action] += temp['customise'] ? " --customise " + (temp['customise'] || "") : "";
        delete temp['customise'];
        $scope.drive[ds][action] += temp['scenario'] ? " --scenario " + (temp['scenario'] || "") : "";
        delete temp['scenario'];
        $scope.drive[ds][action] += " --no_exec";
        $scope.drive[ds][action] += " --python";
        $scope.drive[ds][action] += " reco_" + $scope.data['era'] + "_" + ds.split("/")[1] + ".py";
        $scope.drive[ds][action] += " --fileout";
        $scope.drive[ds][action] += " reco_" + $scope.data['era'] + "_" + ds.split("/")[1] + ".root";
    }

    if (action == 'skim'){

      if (!isDefault){

        if ($scope.data['req'][ds]['action'][action] != undefined){
          if ($scope.defCon['skim'] != undefined &&/SKIM:/.test($scope.defCon['skim']['steps']) && $scope.jsons.skim[ds.split("/")[1]] != undefined){
            str = $scope.data['req'][ds]['action'][action]['steps'].split('SKIM:');
            $scope.data['req'][ds]['action'][action]['steps'] = "";
            temp['steps'] = "";

            if (str[0] != undefined){
              $scope.data['req'][ds]['action'][action]['steps'] += str[0];
              temp['steps'] += str[0];
            }

            $scope.data['req'][ds]['action'][action]['steps'] += "SKIM:";
            temp['steps'] += "SKIM:";
            temp['steps'] += $scope.jsons.skim[ds.split("/")[1]];

            if (str[1] != undefined){
              $scope.data['req'][ds]['action'][action]['steps'] += str[1];
              temp['steps'] += str[1];
            }
          }
        }
      }

        $scope.drive[ds][action] = "";
        $scope.drive[ds][action] = "cmsDriver.py skim";
        $scope.drive[ds][action] += temp['steps'] ? " -s " + (temp['steps'] || "") : "";
        delete temp['steps'];  
        $scope.drive[ds][action] += temp['n'  ] ? " -n " + (temp['n'] || "") : "";
        delete temp['n'];
        $scope.drive[ds][action] += temp['conditions'] ? " --conditions " + (temp['conditions'] || " ") : "";
        delete temp['conditions'];
        $scope.drive[ds][action] += temp['skimoption'] ? " --skimoption " + (temp['skimoption'] || " ") : "";
        delete temp['skimoption'];
        $scope.drive[ds][action] += " --no_exec";
        $scope.drive[ds][action] += " --python_filename";
        $scope.drive[ds][action] += " skim_" + $scope.data['era'] + "_" + ds.split("/")[1] + ".py";
     }     

    if (action == 'mini'){
        $scope.drive[ds][action]= "cmsDriver.py mini ";
        $scope.drive[ds][action] += temp['steps'] ? "-s " + (temp['steps'] || " ") : "";
        delete temp['steps'];
        $scope.drive[ds][action] += temp['n'] ? " -n " + (temp['n'] || " ") : "";
        delete temp['n'];
        $scope.drive[ds][action] += " --no_exec";
        $scope.drive[ds][action] += " --python_filename";
        $scope.drive[ds][action] += " mini_" + $scope.data['era'] + "_" + ds.split("/")[1] + ".py";

        if ($scope.check[ds] == undefined || $scope.check[ds]['reco'] == true){
          $scope.drive[ds][action] += " --filein";
          $scope.drive[ds][action] += " reco_" + $scope.data['era'] + "_" + ds.split("/")[1] + ".root";   
        }else{
          $scope.drive[ds][action] += " --filein";
          $scope.drive[ds][action] += " dbs:" + ds; 
        }
    }

   
    for (key in temp){
      $scope.drive[ds][action] += " --" + key + " ";
      if (temp[key] == 'true'){
        $scope.drive[ds][action] += "";
      } else {
        $scope.drive[ds][action] += temp[key];
      }
    }     
  };

  $scope.cleanDatasetInfo = function(ds, action)
  {
    delete $scope.data['req'][ds]['action'][action];
    delete $scope.allOpt[ds][action];
    $scope.drive[ds][action] = {};
  };

  $scope.addDatasetInfo = function (ds, action)
  {
    $scope.data['req'][ds]['action'][action] = {};          
    $scope.allOpt[ds][action] = JSON.parse(JSON.stringify($scope.defOpt[action]));
    //if there are default configs
    if ($scope.checkAll[action] == true){
      if ($scope.defCon[action] == undefined){
        $scope.data['req'][ds]['action'][action] = {};
      }else{
        $scope.data['req'][ds]['action'][action] = JSON.parse(JSON.stringify($scope.defCon[action]));
      }
      $scope.allOpt[ds][action] = JSON.parse(JSON.stringify($scope.allOpt['Default'][action]));
    }
  };

  //==============Actions with doc============//

  $scope.updateDoc = function()
  {
    $scope.alertMsg['show'] = false;
   // $scope.is_tested = false;
    $http({
      method: 'POST', 
      url:'update_file', 
      data: {
              'doc' : $scope.doc, 
              '_id': $scope.data['_id'],
              '_rev' : $scope.doc['_rev'],
              'alca' : $scope.jsons.alca,
              'lumi' : $scope.jsons.lumi,
              'skim' : $scope.jsons.skim

            }
    }).success(function(data, status){
      $scope.loadData();
      $scope.alertMsg = {error : false, msg : "Action was successful.", show : true};     
      console.log("Success updating the doc: " + data + " " + status);
    }).error(function(status){
      $scope.alertMsg = {error : true, msg : "Action was unsuccessful.", show : true};
      console.log("Error while updating the doc: " + status);
    }); 
  };
//=============Runs through the datasets and checks if there is data in the stderr n stdout to show the output=========//
  $scope.checkTests = function()
    {
          console.log("checking the tests");
          angular.forEach($scope.data['req'], function (value, key){  //key is the name of dataset
          $scope.data['req'][key]["flag"] = "";
          if( $scope.data['req'][key]['stderr'] != undefined && $scope.data['req'][key]['stdout'] != undefined){
                $scope.is_tested = true;            
            }
          else {
            $scope.is_tested = false;
            $scope.data['req'][key]["stderr"] = "";
            $scope.data['req'][key]["stdout"] = "";
            }
          //$scope.data['req'][key]['stdout'] = "Tests are being run. Please wait";

        });

    };
  //==========calls flask script which will only run through cmsRun in the cmsenv=====
  //==========to check if the data input for all the datasets is correct=============
  $scope.testDoc = function()
  {
    $scope.alertMsg['show'] = false;
    $scope.working_on = true;
    $scope.is_tested = true;
    //$scope.cleanTests();
    $http({
      method: 'POST',
      url:'test_campaign',
      data:{
            'doc' : $scope.doc,
            '_id' : $scope.data['_id'],
            '_rev': $scope.doc['_rev'],
            'CMSSW' : $scope.data['CMSSW'],
            'req' : $scope.data['req']
            }
    }).success(function(data,status){
      if (data == 'No scram'){
        $scope.alertMsg = {error : true, msg : "Test was unsuccessful. Scram version was not found for this CMSSW version", show : true};
      }
      else if (data['flag'] == "Fatality"){
        $scope.alertMsg = {error : true, msg : "Fatal exception was found. See Test Output", show : true};
      }
      else{
      $scope.alertMsg = {error:false, msg: "No fatal errors. See Test Output to be sure", show : true};
    }
    $scope.working_on = false;
    angular.forEach($scope.data['req'], function (value, key){  //key is the name of dataset
      $scope.data['req'][key]['stderr'] = data[key]['stderr'];
      $scope.data['req'][key]['stdout'] = data[key]['stdout'];

      console.log($scope.data['req'][key]['stderr']);
      console.log("Test run succeeded, check Test Output for results")
    });
    }).error(function(status){
      $scope.alertMsg = {error: true, msg : "Test failed, check the logs", show : true};
      $scope.working_on = false;
      console.log("Error while running the test: " + status);
    });

  };
  $scope.getAllDocs = function()
  {
    $http({
      method: 'GET', 
      url:'get_all_docs', 
    }).success(function(data, status){
      var tmp = JSON.parse(JSON.stringify(data['rows']));
      for(var i = 0; i < tmp.length; i++){
        var iteratee = tmp[i];
        $scope.list.push(iteratee['id']); 
      }
      console.log("Success. Got all docs");
    }).error(function(status){
      console.log("Error while getting docs:" + status);
    }); 
  };

  $scope.saveDoc = function()
  {
    $scope.alertMsg['show'] = false;
    $scope.cleanDrive();
    $scope.working_on = true;
    $http({
      method: 'POST', 
      url:'save_doc', 
      data: {
              '_id': $scope.data['_id'], 
              'data': $scope.data, 
              'drive' : $scope.drive, 
              'check' : $scope.check,
              'allOpt' : $scope.allOpt,
              'alca' : $scope.jsons.alca,
              'lumi' : $scope.jsons.lumi,
              'skim' : $scope.jsons.skim,
              'defaults' : $scope.defCon,
              'submitted' : false
            }
    }).success(function(data, status){
      $scope.alertMsg = {error : false, msg : "Action was successful.", show : true};
      $scope.working_on = false;
      $scope.loadData();
      $scope.getAllDocs();
      $scope.inTheList = true;
      console.log("Success while saving the doc" + data + " " + status);
    }).error(function(status){
      $scope.alertMsg = {error : true, msg : "Action was unsuccessful.", show : true};
      $scope.working_on = false;      
      console.log("Error while saving the doc:" + status);
    });  
  };

  $scope.loadData = function()
  {
    console.log("id: " + $scope.data['_id']);
    $scope.working_on = false;
    $http({
            method: 'POST', 
            url:'load_data', 
            data: {
                    '_id': $scope.data['_id']
                  }
          }).success(function(data, status){
      $scope.doc = data
      
      $scope.drive = $scope.doc['drive'];      
      $scope.jsons.skim = $scope.doc['skim'];
      $scope.jsons.alca = $scope.doc['alca'];
      $scope.jsons.lumi = $scope.doc['lumi'];
      
      for (action in $scope.doc['defaults']){
        $scope.checkAll[action] = true;
      }
      $scope.defCon = $scope.doc['defaults'];

      $scope.check = $scope.doc['check'];
      $scope.allOpt = $scope.doc['allOpt'];
      
      $scope.data = $scope.doc['data'];

      for (ds in $scope.data['req']){
        for (action in $scope.data['req'][ds]['action']){
          $scope.formDriver(ds,action);
        }
      }
      $scope.checkTests();
      $scope.alertMsg = {error : false, msg : "Loading was successful.", show : true};
    }).error(function(status){
      $scope.alertMsg = {error : true, msg : "Loading was unsuccessful.", show : true};
      console.log("Error while loading:" + status);
    }); 
  };

  $scope.submitCampaign = function()
  {
    $scope.alertMsg['show'] = false;
    $scope.doc['submitted'] = true;
    $scope.working_on = true;
    $http({
      method: 'POST', 
      url: 'submit_campaign', 
      data: {
        'doc' : $scope.doc, 
        '_id': $scope.data['_id'],
        '_rev' : $scope.doc['_rev'],
        'CMSSW' : $scope.data['CMSSW']
    }    
      }).success(function(data, status){
      $scope.working_on = false;
      if (data == '0'){
        $scope.alertMsg = {error : false, msg : "Submit was successful.", show : true};
        console.log("Complete success! " + data + " status: " + status);
      } else if (data == 'No scram'){
        $scope.alertMsg = {error : true, msg : "Submit was unsuccessful. Scram version was not found for this CMSSW version", show : true};
        $scope.doc['submitted'] = false;
      } else {
        $scope.alertMsg = {error : true, msg : "Submit was unsuccessful. Something went wrong, better check the logs!", show : true};
        console.log("Submit went wrong:" + data +" status: " + status);
      }
    }).error(function(status){
      $scope.alertMsg = {error : true, msg : "Submitting was unsuccessful", show : true};
      $scope.working_on = false;
      console.log("Submit error: " + status);
    });
  };
  //======================Copy to clipboard button for the Full JSON fields===================================
  $scope.copyToClipboard = function(text)
  {
    var textArea = document.createElement("textarea");
    textArea.style = "none";
    textArea.value = angular.toJson(text);
    console.log(angular.toJson(text));
    document.body.appendChild(textArea);
    textArea.select();
    try {
                var successful = document.execCommand('copy');
                if (!successful) throw successful;
            } catch (err) {
                console.log("failed to copy", text);
            }
    document.body.removeChild(textArea);
  };
  //=======Get autoSkim matrix and puts into the input field=====//
  $scope.getSkimMatrixValue = function ()
  {
    $http({
      method: 'POST', 
      url: 'get_skim_matrix_value', 
      data: {
        'CMSSW' : $scope.data['CMSSW']
    }
  }).success(function(data,status){
      console.log("Success while getting Skim matrix value" + angular.toJson(data));
      $scope.jsons.skim = data;
    }).error(function(status){
      console.log("Error on getting Skim matrix value " + status);
    });

  };
  //=======Get autoSkim matrix and puts into the input field=====//
  $scope.getAlCaMatrixValue = function ()
  {
    $http({
      method: 'POST', 
      url: 'get_alca_matrix_value', 
      data: {
        'CMSSW' : $scope.data['CMSSW']
    }
  }).success(function(data,status){
      console.log("Success on getting AlCa matrix value " + angular.toJson(data));
      $scope.jsons.alca = data;
    }).error(function(status){
      console.log("Error on getting AlCa matrix value " + status);
    });

  };
  //===============Get the dataset's key value from the AlCa matrix================//
  $scope.getAlCaDatasetValue = function (nameVal, type)
  {
    console.log("clicked " + nameVal);
    var slashCounter = 0;
    for (i = 1; i < nameVal.length; i++){     //looping through all the letters in the full dataset name to only get the DataSet(f.e. SingleElectron)
        if (nameVal.charAt(i)==='/'){
          var slashIndex = i;
          break;
        }
    }
    dsValue = nameVal.substring(1,slashIndex);
    matrixVal = $scope.jsons.alca;
    if(matrixVal[dsValue] == undefined){
      $scope.alertMsg = {error : true, msg : "Check if the AlCa matrix is not empty and if there is the Dataset value!", show : true};
    }
    else{
      console.log(matrixVal[dsValue]);
      if($scope.data['req'][nameVal]['action'][type]['steps'] == undefined){ //just checkin if comma is needed and also avoiding 'undefined' string added to the steps
        $scope.data['req'][nameVal]['action'][type]['steps'] = "ALCA:" + matrixVal[dsValue];
      }
      else{
        $scope.data['req'][nameVal]['action'][type]['steps'] += ",ALCA:" + matrixVal[dsValue];
      }
    }
  }
  //===============Get the dataset's key value from the AlCa matrix================//
  $scope.getSkimDatasetValue = function (nameVal, type)
  {
    console.log("clicked " + nameVal);
    var slashCounter = 0;
    for (i = 1; i < nameVal.length; i++){     //looping through all the letters in the full dataset name to only get the DataSet(f.e. SingleElectron)
        if (nameVal.charAt(i)==='/'){
          var slashIndex = i;
          break;
        }
    }
    dsValue = nameVal.substring(1,slashIndex);
    matrixVal = $scope.jsons.skim;
    if(matrixVal[dsValue] == undefined){
      $scope.alertMsg = {error : true, msg : "Check if the Skim matrix is not empty and if there is the Dataset value!", show : true};
    }
    else{
      if($scope.data['req'][nameVal]['action'][type]['steps'] == undefined){ //just checkin if comma is needed and also avoiding 'undefined' string added to the steps
        $scope.data['req'][nameVal]['action'][type]['steps'] = "SKIM:" + matrixVal[dsValue];
      }
      else{
        $scope.data['req'][nameVal]['action'][type]['steps'] += ",SKIM:" + matrixVal[dsValue];
      }
    }
  }
//========Checks if --runUnscheduled is inside string and adds/removes accordingly ==========//
  $scope.addRunUnscheduled = function (nameVal, type)
    {
        if($scope.drive[nameVal][type].search("--runUnscheduled") === -1){
                    if($scope.data['req'][nameVal]['action'][type]['steps'] == undefined){
                        $scope.data['req'][nameVal]['action'][type]['steps'] = " --runUnscheduled";
                    }
                    else{
                        $scope.data['req'][nameVal]['action'][type]['steps'] += " --runUnscheduled";                
                    }
                    $scope.check[nameVal][type+"Unscheduled"] = true;
        }
        else if($scope.drive[nameVal][type].search("--runUnscheduled") !== -1){
                $scope.data['req'][nameVal]['action'][type]['steps'] = $scope.data['req'][nameVal]['action'][type]['steps'].replace(" --runUnscheduled", "");
                    $scope.check[nameVal][type+"Unscheduled"] = false;
        }
    }
  //==================WATCH===================//

  $scope.$watch("data['req']", function(newValue, oldValue) {
    for (ds in newValue){
      if (oldValue[ds] == undefined || newValue[ds] != oldValue[ds]){
        for (action in newValue[ds]['action']){
          if (oldValue[ds] == undefined || oldValue[ds]['action'][action] == undefined || newValue[ds]['action'][action]!=oldValue[ds]['action'][action]){
            $scope.formDriver(ds, action);
          }
        }
      }
    }
  },true);

  $scope.$watch("skim", function(newValue, oldValue) {
    console.log("watch skim");
    for (ds in $scope.data['req']){
      $scope.checkSkim(ds);
      $scope.formDriver(ds, 'skim');
    }
  },true);

  $scope.$watch("alca", function(newValue, oldValue) {
    for (ds in $scope.data['req']){
      for (action in $scope.data['req'][ds]['action']){
        $scope.checkAlca(ds);
        $scope.formDriver(ds, action);
      }
    }
  },true);

  $scope.$watch("defCon", function(newValue, oldValue) {
    for (action in newValue){
      if (oldValue[action] == undefined || newValue[action] != oldValue[action]){

        for (field in newValue[action]){
          if (oldValue[action] == undefined || oldValue[action][field] == undefined || newValue[action][field]!=oldValue[action][field]){
            for (ds in $scope.allOpt){
              if (ds != 'Default'){
                if ($scope.data['req'][ds]['action'][action] == undefined){
                  $scope.data['req'][ds]['action'][action] = {};
                }
                if ($scope.allOpt[ds][action] != undefined && $scope.allOpt[ds][action][field] != undefined){
                  $scope.data['req'][ds]['action'][action][field] = newValue[action][field];
                }
                
                if (action == 'reco'){
                  $scope.checkAlca(ds);
                }
              }
      
            }            
          }
        }         
      }
      $scope.formDriver('Default', action);
    }
  },true);

  $scope.$watch("data['_id']", function() {
    //id is in the list?
    if (($scope.list).indexOf($scope.data['_id']) > -1){
      $scope.inTheList = true;
    } else {
      $scope.inTheList = false;
    }
  },true);

  $scope.$watch("data['GT']", function() {
    
    if ($scope.defCon.reco != undefined){
      $scope.defCon.reco.conditions = $scope.data.GT;
    }
    if ($scope.defCon.skim != undefined){
      $scope.defCon.skim.conditions = $scope.data.GT;
    }
    if ($scope.defCon.mini != undefined){
      $scope.defCon.mini.conditions = $scope.data.GT;
    }
    
  },true);

  //==============Prepare data================//
  $scope.getAllDocs();

});

//===============JSON validator===============//
myApp.directive("inlineEditable", function () {
    return {
        require: 'ngModel',
        restrict: "E",
        scope: {},
        //transclude: true,
        replace: true,
        templateUrl: "static/temp.textarea.html",
        link: function (scope, element, attr, ctrl) {
            ctrl.$render = function () {
                scope.test = JSON.stringify(ctrl.$viewValue, null, 4);
            };
            scope.update = function () {
                var object = null;
                try {
                    object = JSON.parse(scope.test);
                    ctrl.$setViewValue(object);
                    ctrl.$setValidity("bad_json", true);
                } catch (err) {
                    ctrl.$setValidity("bad_json", false);
                }
            };
        }
    }
});

