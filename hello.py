#!/usr/bin/env python
import os
import json
import pwd
import os.path
import urllib2
import subprocess
import sys
import datetime
import xml.dom.minidom
import imp

from couchdb_interface import CouchDBInterface
from config import CONFIG
from flask import Flask, send_from_directory, redirect, Response, make_response, request, jsonify
from subprocess import Popen, PIPE

app = Flask(__name__)
###original
WORK_DIR = CONFIG.WORK_DIR
WORKDIR = ''
couch = CouchDBInterface()
cred = CONFIG.PRIV_CRED

###
###Replaced with below
# WORK_DIR = '/home/dataManagement/stuff'
# couch = CouchDBInterface()
# cred = '/afs/cern.ch/user/j/jsiderav/private/PdmVService.txt'
@app.route("/", methods=["GET", "POST"])
def hello():
    """
    Opening function that directs to index.html
    """
    return send_from_directory('templates', 'index.html')

@app.route('/api/help', methods = ['GET'])
def help():
    """Print available functions."""
    func_list = {}
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            func_list[rule.rule] = app.view_functions[rule.endpoint].__doc__
    return jsonify(func_list)

def get_scram(__release):
    """
    By the given __release version checks with the scram architecture versions'
    and returns the architecture name if found
    """
    scram = ''
    xml_data = xml.dom.minidom.parseString(os.popen("curl -s --insecure '%s'" % CONFIG.REL_XML).read())

    for arch in xml_data.documentElement.getElementsByTagName("architecture"):
        scram_arch = arch.getAttribute('name')
        for project in arch.getElementsByTagName("project"):
            release = str(project.getAttribute('label'))
            if release == __release:
                scram = scram_arch

    return scram

@app.route('/load_data', methods=["POST"])
def load_data():
    """
    Communicates with the CouchDB and returns the object
    according to it's _id as a JSON
    """
    data = json.loads(request.get_data())
    _id = data['_id']
    doc_data = couch.get_file(_id)
    return json.dumps(doc_data)

@app.route('/delete_doc', methods=["DELETE"])
def delete_data():
    """
    Sends a request to couchDB to delete the given document
    according to the _id var of the record
    """
    data = json.loads(request.get_data())
    _id = data['_id']
    _rev = couch.get_file(_id)['_rev']
    try:
        doc_data = couch.delete_file(_id, _rev)

        return "success"
    except:
        return "error"

@app.route('/get_all_docs', methods=["GET"])
def get_all_docs():
    """
    Used in saveDocs() function to get all docs and later for the
    object to be pushed in to the data list
    """
    info = {}
    info = couch.get_all_docs()
    fullInfo = {}
    x = {}
    for rows in info['rows']:
        x = couch.get_file(rows['id'])
        name = x['data']['_id']
        fullInfo[name] = {}
        try:
            fullInfo[name]['era'] = x['data']['era']
            fullInfo[name]['CMSSW'] = x['data']['CMSSW']
            fullInfo[name]['submitted'] = x['submitted']

            fullInfo[name]['is_tested'] = x['is_tested']

        except:
            fullInfo[name]['is_tested'] = False
    return json.dumps(fullInfo)

@app.route('/update_file', methods=["POST"])
def update_file():
    """
    Gets the object from the browser and updates it in the CouchDB
    """
    data = json.loads(request.get_data())
    _id = data['_id']
    _rev = data['_rev']
    prep_id = data['doc']['data']['prepId']
    data['doc']['alca'] = data['alca']
    data['doc']['skim'] = data['skim']
    data['doc']['lumi'] = data['lumi']
    data['doc']['is_tested'] = data['is_tested']
    if prep_id.split('-')[1] != data['doc']['data']['procStr']:
        prep_id = prep_id.split('-')[0] + "-" + data['doc']['data']['procStr']+ "-" + prep_id.split('-')[2]
        data['doc']['data']['prepId'] = prep_id
    doc = json.dumps(data['doc'])
    doc_data = couch.update_file(_id, doc, _rev)
    return json.dumps(doc_data)

@app.route("/get_skim_matrix_value", methods=["GET", "POST"])
def get_skim_matrix_val():
    """
    Downloads the autoSkim matrix from the Git repo and passes it to Angular controller which
    updates the text field
    """
    file = "temporarySkim.py"
    data = json.loads(request.get_data())
    url = CONFIG.GIT_CMSSW + data['CMSSW'] + "/Configuration/Skimming/python/autoSkim.py"
    response = urllib2.urlopen(url)
    fh = open(file, 'w')
    fh.write(response.read())
    fh.close()
    temp = imp.load_source("matrix","temporarySkim.py")
    return json.dumps(temp.autoSkim)

@app.route("/get_alca_matrix_value", methods=["GET", "POST"])
def get_alca_matrix_val():
    """
    Downloads the autoAlca matrix from the Git repo and passes it to Angular controller which
    updates the text field
    """
    file = "temporaryAlca.py"
    data = json.loads(request.get_data())
    url = CONFIG.GIT_CMSSW+data['CMSSW']+"/Configuration/AlCa/python/autoAlca.py"
    response = urllib2.urlopen(url)
    fh = open(file, 'w')
    fh.write(response.read())
    fh.close()
    temp2 = imp.load_source("matrix","temporaryAlca.py")
    return json.dumps(temp2.AlCaRecoMatrix)

@app.route('/save_doc', methods=["POST"])
def save_doc():
    """
    Puts a newly created object to the CouchDB
    """
    data = json.loads(request.get_data())
    sequence = couch.get_sequence()
    seq_rev = sequence['_rev']
    data['data']['prepId'] = 'ReReco-' + data['data']['procStr'] + "-000" + str(sequence['sequenceNo'])
    sequence['sequenceNo'] = int(sequence['sequenceNo']) + 1
    seq_data = couch.update_sequence(json.dumps(sequence), seq_rev)
    doc_data = couch.put_file(json.dumps(data))
    return json.dumps(doc_data)

def get_test_bash(__release, _id, __scram):
    """
    Small bash script generator which will initialize cms environment,
    and generate config files for the cmsRun command
    """
    #------------To get the config files of the datasets---------------------
    WORKDIR = "Test_Folder"
    comm = "#!/bin/bash\n"
    comm += "mkdir %s\n" %WORKDIR
    comm += "cd %s\n" %WORKDIR
    comm += "export SCRAM_ARCH=%s\n" %(__scram)
    comm += "export PATH=$PATH:/afs/cern.ch/cms/common"
    comm += "export CVSROOT=:gserver:cmssw.cvs.cern.ch:/local/reps/CMSSW"
    comm += "export CMS_PATH=/afs/cern.ch/cms"
    comm += "source /afs/cern.ch/cms/cmsset_default.sh\n"
    comm += "scram project %s\n" % (__release)
    comm += "cd %s/src\n" % (__release)
    comm += "rm step_make.py\n"
    comm += "rm couchdb_interface.py\n"
    comm += "wget %s\n" %CONFIG.GIT_STEP_MAKE
    comm += "wget %s\n" %CONFIG.GIT_COUCHDB
    # comm += "eval `scram runtime -sh`\n"
    comm += "eval `scram runtime -sh` && python step_make.py --in=%s\n" % (_id)
    comm += "cat %s | voms-proxy-init -voms cms -pwstdin\n" %(cred)
    return comm

def get_submit_bash(__release, _id, __scram):
    """
    Returns the stuff/tmp_execute.sh script that communicates with various CMSSW functions
    according to the current campaign submit data
    """
    #------------To checkout CMSSW---------------------
    WORKDIR = datetime.datetime.now().strftime('%Y-%m-%d_%H_%M')
    comm = "#!/bin/bash\n"
    comm += "mkdir %s\n" %WORKDIR
    comm += "cd %s\n" %WORKDIR
    comm += "export SCRAM_ARCH=%s\n" %(__scram)
    comm += "export PATH=$PATH:/afs/cern.ch/cms/common"
    comm += "export CVSROOT=:gserver:cmssw.cvs.cern.ch:/local/reps/CMSSW"
    comm += "export CMS_PATH=/afs/cern.ch/cms"
    comm += "source /afs/cern.ch/cms/cmsset_default.sh\n"
    comm += "scram project %s\n" % (__release)
    comm += "cd %s/src\n" % (__release)
    comm += "cmsenv\n"
    # comm += "git cms-addpkg Configuration/Skimming\n"
    comm += "eval `scram runtime -sh`\n"
    # comm += "mkdir Configuration\n"
    # comm += "mkdir Skimming\n"
    # comm += "cd Configuration/Skimming\n"
    # comm += "wget https://raw.githubusercontent.com/cms-sw/cmssw/CMSSW_8_0_1/Configuration/Skimming/python/autoSkim.py\n"
    #####################LOCAL REPO IS CURRENTLY BEING USED FOR THE WGET LINES#################
    comm += "wget %s\n" %CONFIG.GIT_STEP_MAKE
    comm += "wget %s\n" %CONFIG.GIT_COUCHDB
    ######################################SEE ABOVE, NOOB######################################
    comm += "python step_make.py --in=%s\n" % (_id)
    #-------------For wmcontrol.py---------------------
    comm += "source %s\n" %CONFIG.WMCLIENT
    comm += "export PATH=/afs/cern.ch/cms/PPD/PdmV/tools/wmcontrol_testful:${PATH}\n"
    comm += "cat %s | voms-proxy-init -voms cms -pwstdin\n" %(cred)
    comm += "echo 'executing scram runtime'\n"
    comm += "eval `scram runtime -sh`\n"
    comm += "echo 'executing export'\n"
    comm += "export X509_USER_PROXY="+CONFIG.USER_PROXY+"\n"
    comm += "echo 'executing step wmcontrol.py'\n"
    comm += "wmcontrol.py --wmtest --req_file=master.conf\n"
    #--------------------------------------------------
    return comm

@app.route('/das_driver_all', methods=["GET","POST"])
def das_driver_all():
    """
    Takes the dataset name and checks in DAS if it's in there, if the dataset is stored
    in disk and if so - download the needed .root file for cmsRun to launch
    """
    def check_ds():
        """
        Local scope method which loops through the result of das_client queries,
        exits on first found result, doesn't bother too much
        """
        proc = subprocess.call("source /afs/cern.ch/cms/cmsset_default.sh; eval `scramv1 runtime -sh`; cat "+cred+" | voms-proxy-init -voms cms -pwstdin > dasTest_voms.txt;export X509_USER_PROXY="+CONFIG.USER_PROXY+"; das_client.py  --limit 0 --query 'site dataset="+key+"' --key=$X509_USER_PROXY --cert=$X509_USER_PROXY --format=json",stdout=log_file,stderr=err_file,shell=True)
        log_file.seek(0)
        err_file.seek(0)
        text = log_file.read()
        data = json.loads(text)
        for item in data['data']:
            for site in item['site']:
                if 'dataset_fraction' in site and site['kind'] == "Disk":
                    proc = subprocess.call("source /afs/cern.ch/cms/cmsset_default.sh; eval `scramv1 runtime -sh`; cat "+cred+" | voms-proxy-init -voms cms -pwstdin > dasTest_voms.txt;export X509_USER_PROXY="+CONFIG.USER_PROXY+"; das_client.py  --limit 10 --query 'file dataset="+key+" site="+site['name']+"' --key=$X509_USER_PROXY --cert=$X509_USER_PROXY --format=json",stdout=log2_file, stderr=err2_file, shell=True)
                    log2_file.seek(0)
                    err2_file.seek(0)
                    text2 = log2_file.read()
                    data2 = json.loads(text2)
                    for item2 in data2['data']:
                        for root in item2['file']:
                            return root['name']
        return ("No")

    data = json.loads(request.get_data())
    __release = data['CMSSW']
    _id = data['_id']
    _rev = couch.get_file(_id)['_rev']
    doc = json.dumps(data['doc'])
    req = couch.get_file(_id)['data']['req']
    os.chdir(WORK_DIR + "/Test_Folder/" + __release + "/src")
    i = 0
    fileNames = {}
    for key in req.keys():
        fileNames[key] = {}
        log_file = file('dasTest_out' + str(i) + '.txt','w+')
        err_file = file('dasTest_err' + str(i) + '.txt','w+')
        log2_file = file('dasTest_2out' +str(i) + '.txt','w+')
        err2_file = file('dasTest_2err' + str(i) + '.txt','w+')
        fileNames[key]['file'] = check_ds()
        i += 1
        log_file.close()
        err_file.close()
        log2_file.close()
        err2_file.close()
    return json.dumps(fileNames)

@app.route('/das_driver_single', methods=['GET','POST'])
def das_driver_single():
    """
    Same as above, just does it with single dataset, could refactor to use the same function, but maybe laterz
    """
    data = json.loads(request.get_data())
    dsName = data['_id']
    __release = data['CMSSW']
    os.chdir(WORK_DIR + "/Test_Folder/" + __release + "/src")
    fileNames = {}
    fileNames[dsName] = {}
    log_file = file('dasTest_outSingle.txt','w+')
    err_file = file('dasTest_errSingle.txt','w+')
    log2_file = file('dasTest_2outSingle.txt','w+')
    err2_file = file('dasTest_2errSingle.txt','w+')
    proc = subprocess.call("source /afs/cern.ch/cms/cmsset_default.sh; eval `scramv1 runtime -sh`; cat " + cred + " | voms-proxy-init -voms cms -pwstdin > dasTest_voms.txt;export X509_USER_PROXY=" + CONFIG.USER_PROXY + "; das_client.py  --limit 0 --query 'site dataset=" + dsName + "' --key=$X509_USER_PROXY --cert=$X509_USER_PROXY --format=json", stdout=log_file, stderr=err_file, shell=True)
    log_file.seek(0)
    err_file.seek(0)
    text = log_file.read()
    data = json.loads(text)
    for item in data['data']:
        for site in item['site']:
            if 'dataset_fraction' in site and site['kind'] == "Disk":
                proc = subprocess.call("source /afs/cern.ch/cms/cmsset_default.sh; eval `scramv1 runtime -sh`; cat " + cred + " | voms-proxy-init -voms cms -pwstdin > dasTest_voms.txt;export X509_USER_PROXY=" + CONFIG.USER_PROXY + "; das_client.py  --limit 10 --query 'file dataset=" + dsName + " site=" + site['name'] + "' --key=$X509_USER_PROXY --cert=$X509_USER_PROXY --format=json", stdout=log2_file, stderr=err2_file, shell=True)
                log2_file.seek(0)
                err2_file.seek(0)
                text2 = log2_file.read()
                data2 = json.loads(text2)
                for item2 in data2['data']:
                    for root in item2['file']:
                        fileNames[dsName]['file'] = root['name']
                        return json.dumps(fileNames)
    log_file.close()
    err_file.close()
    log2_file.close()
    err2_file.close()
    return "No"

@app.route('/test_campaign', methods=["GET","POST"])
def test_campaign():
    """
    Creates a bash script that will proceed with the config file generation and
    will run the cmsRun command without injecting it to request manager.
    Runs tests with all the datasets of the campaign and return jsons
    should be processed by the dataset name in controllers.js
    """
    data = json.loads(request.get_data())
    __release = data['CMSSW']
    _id = data['_id']
    _rev = data['_rev']
    req = data['req']
    doc = json.dumps(data['doc'])
    __scram = get_scram(__release)
    if __scram == '':
        return "No scram"
    #----------Creating & running bash file----------------------

    __curr_dir = os.getcwd()
    os.chdir(WORK_DIR)
    __exec_file = open("tmp_test.sh", "w")
    __exec_file.write(get_test_bash(__release, _id, __scram))
    __exec_file.close()
    log_file = file('logTest.txt','w')
    err_file = file('log2Test.txt','w')
    proc = subprocess.Popen(['bash', 'tmp_test.sh'],
                        stdout=log_file, stderr=err_file, close_fds=True)
    log_file.close()
    err_file.close()
    #_ret_code = proc.wait()
    #raise Exception(str(_ret_code))
    #-----------------Running the cmsRun command-------------------------
    os.chdir("Test_Folder" + '/' + __release + '/' + "src/")
    cfgFile = open("master.conf","r")
    i = 0   #loop needed to cycle through all the datasets and differ gathered information based on the dataset name
    dynamicLogger = {}
    for line in cfgFile:
        if line.startswith("cfg_path="):

            arg = line[9:]
            dynamicLogger[req.keys()[i]] = {}
            log_file = file(str(i) + "log.txt", "w+")
            err_file = file(str(i) + "errLog.txt", "w+")

            proc = subprocess.call(('eval `scram runtime -sh` && cmsRun -n 10 %s') %(arg), stdout=log_file, stderr=err_file, shell=True, close_fds=True)

            log_file.seek(0)
            err_file.seek(0)
            dynamicLogger[req.keys()[i]]['stderr'] = err_file.read()
            dynamicLogger[req.keys()[i]]['stdout'] = log_file.read()

            log_file.close()
            err_file.close()

            if str(dynamicLogger[req.keys()[i]]['stderr']).find("Begin fatal exception"):
                dynamicLogger[req.keys()[i]]['flag'] = "Fatality"    #subzero ftw
            i += 1
    cfgFile.close()

#-----------------Uploading log file-------------------------
    os.chdir(__curr_dir) ## back to working dir
    return json.dumps(dynamicLogger)

@app.route('/submit_campaign', methods=["POST"])
def submit_campaign():
    """
    Executes the submit button by updating the current campaign, creating/executing the script in get_submit_bash()
    Logs of the process can be found in the WORK_DIR variable location and a log is also uploaded to the CouchDB
    together with the object
    """
    data = json.loads(request.get_data())

    __release = data['CMSSW']
    _id = data['_id']
    _rev = data['_rev']
    doc = json.dumps(data['doc'])

    __scram = get_scram(__release)
    if __scram == '':
        return "No scram"
    couch.update_file(_id, doc, _rev)
    #----------Creating & running bash file----------------------
    __curr_dir = os.getcwd()
    os.chdir(WORK_DIR)
    __exec_file = open("tmp_execute.sh", "w")
    __exec_file.write(get_submit_bash(__release, _id, __scram))
    __exec_file.close()
    log_file = file('log.txt','w')
    err_file = file('log2.txt','w')
    proc = subprocess.Popen(['bash', 'tmp_execute.sh'],
                        stdout=log_file, stderr=err_file, close_fds=True)
    __ret_code = proc.wait()
    log_file.close()
    err_file.close()
    #-----------------Uploading log file-------------------------
    rev = couch.get_file(_id)['_rev']
    couch.upload_attachment(_id, rev, 'log.txt')

    os.chdir(__curr_dir) ## back to working dir
    return str(__ret_code)

if __name__ == "__main__":
    import logging
    logFormatStr = '[%(asctime)s] p%(process)s {%(pathname)s:%(lineno)d} %(levelname)s - %(message)s'
    logging.basicConfig(format = logFormatStr, filename = "global.log", level=10)
    formatter = logging.Formatter(logFormatStr,'%m-%d %H:%M:%S')
    fileHandler = logging.FileHandler("summary.log")
    fileHandler.setLevel(10)
    fileHandler.setFormatter(formatter)
    streamHandler = logging.StreamHandler()
    streamHandler.setLevel(10)
    streamHandler.setFormatter(formatter)
    app.logger.addHandler(fileHandler)
    app.logger.addHandler(streamHandler)
    app.logger.info("Logging is set up.")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
