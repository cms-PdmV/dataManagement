import json
import os
import optparse
import urllib2
import re
from couchdb_interface import CouchDBInterface


class MasterConfMaker:
    """
    A class that forms master.conf file
    """

    def __init__(self, doc_id):
        """
        init a class
        """
        print "doc_id: %s" %doc_id
        self.couch = CouchDBInterface()
        self.cmsD = True
        self.data = self.couch.get_file(doc_id)

    def makeMaster(self):
        """
        method to form configuration files
        """
        __id = self.data['data']['_id']
        GT = self.data['data']['GT']
        __release = self.data['data']['CMSSW']
        drive = self.data['drive']
        check = self.data['check']
        prep_id = self.data['data']['prepId']
        lumi_list = self.data['lumi']
        era = self.data['data']['era']
        del drive['Default']

        #make master config header
        master = file('master.conf','w')
        header = "[DEFAULT]\n"
        header += "group=ppd\n"
        header += "user=jsiderav\n"
        header += "request_type=ReReco\n"
        header += "release=%s\n" % (__release)
        header += "globaltag=%s\n" % (GT)
        header += "wmtest=true\n"
        if (lumi_list != '' and lumi_list != {}):
            header += "lumi_list=%s\n" % (json.dumps(lumi_list))
        master.write(header)

        #read all drivers and execute
        for ds in drive:
            cfg = ''
            skim_file = ''
            mini_file = ''
            exc = False
            for action in drive[ds]:
                com = drive[ds][action]
                print com
                if com != '' and com != {}:
                    if action == 'reco' and check[ds]['reco'] == True:
                        param = com.split()
                        index = param.index("--python") + 1
                        cfg = param[index]
                        exc = True
                    if action == 'skim' and check[ds]['skim'] == True:
                        param = com.split()
                        index = param.index("--python_filename") + 1
                        skim_file = param[index]
                        exc = True
                    if action == 'mini' and check[ds]['mini'] == True:
                        param = com.split()
                        index = param.index("--python_filename") + 1
                        mini_file = param[index]
                        exc = True

                    if exc == True:
                        os.system(com)

                    exc = False

            site=''
            prio=int(self.data['data']['req'][ds]['prio'])
            #ds = ds.split("/")[1]
            #dataset='/%s/Run%s-v1/RAW' % (ds, era)
            master.write('[%s]\n' % (prep_id))
            master.write('[%s%s%sPrio%d]\n' % (__id, era, ds.split("/")[1], prio))
            master.write('campaign=Run%s\n' % (era))
            master.write('priority=%d\n' % (prio))
            master.write('dset_run_dict={"%s" : %s}\n' % (ds, json.dumps(lumi_list.keys())))

            if (cfg != ''):
                master.write('cfg_path=%s\n' % (cfg))
                transient_output = self.data['data']['req'][ds]['transient_output']
                if (transient_output != '' and transient_output != "[]"):
                    master.write('transient_output=%s\n' % (transient_output))

            if skim_file!='':
                master.write('skim_cfg=%s\n' % (skim_file))
                master.write('skim_name=%s\n' % (skim_file.replace('.py','')))
            if mini_file!='':
                if cfg != '':
                    master.write('step2_cfg=%s' % (mini_file))
                else:
                    master.write('cfg_path=%s' % (mini_file))

            master.write('\n\n')

        master.close()
        return file('master.conf','r').read()

if __name__ == '__main__':
    parser = optparse.OptionParser()
    parser.add_option("--in", dest="input")
    options,args=parser.parse_args()
    conf_maker = MasterConfMaker(options.input)
    conf_maker.makeMaster()
