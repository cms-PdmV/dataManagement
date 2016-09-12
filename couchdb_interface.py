import json
import os
import urllib2

db_url = 'http://moni.cern.ch:5984/campaigns/'
settings_url = 'http://moni.cern.ch:5984/settings/'

class CouchDBInterface:
    """
    A class as interface to couchdb via HTTP protocol
    """

    def __init__ (self):
        """
        init a class
        """
        self.url_address = db_url
        self.settings_address = settings_url
        self.opener = urllib2.build_opener(urllib2.HTTPHandler)

    def put_file(self, stringToPut):
        """
        method to put a document to couchDB when document content specified
        """
        request = urllib2.Request(self.url_address, data = stringToPut)
        request.add_header('Content-Type', 'application/json')
        request.get_method = lambda: 'POST'
        url = self.opener.open(request)
        return json.loads(url.read())

    def get_sequence(self):
        """
        Gets the number to add to campaigns prepId from settings/sequenceGen
        """
        request = urllib2.Request(self.settings_address + "sequenceGen")
        request.add_header('Content-Type', 'text/plain')
        request.get_methods = lambda: 'GET'
        try:
            url = self.opener.open(request)
            return json.loads(url.read())
        except:
            print "Failed"
    
    def update_sequence(self, stringToPut, rev):
        """
        updates the settings/sequenceGen. used mostly after creating a campaign and after incrementation
        """
        request = urllib2.Request(self.settings_address + "sequenceGen" + "?rev=" + rev, data=stringToPut)
        request.add_header('Content-Type', 'text/plain')
        request.get_method = lambda: 'PUT'
        url = self.opener.open(request)
        return json.loads(url.read())

    def get_file(self, fileID):
        """
        method to get a document from couchDB when specified a document ID
        """
        request = urllib2.Request(self.url_address + fileID)
        request.add_header('Content-Type', 'text/plain')
        request.get_method = lambda: 'GET'
        try:
            url = self.opener.open(request)
            return json.loads(url.read())
        except:
            print "Failed"

    def delete_file(self, fileID, rev):
        """
        method to delete a document from couchDB when specified a document ID
        """
        request = urllib2.Request(self.url_address + fileID + '?rev=' + rev)
        request.add_header('Content-Type', 'text/plain')
        request.get_method = lambda: 'DELETE'
        try:
            url = self.opener.open(request)
            return json.loads(url.read())
        except:
            print "Failed delete"

    def update_file(self, fileID, stringToPut,rev):
        """
        method to update a document in couchDB when specified a document ID,
        new Document information and current revision ID is given
        """
        request = urllib2.Request(self.url_address + fileID + "?rev=" + rev, data=stringToPut)
        request.add_header('Content-Type', 'text/plain')
        request.get_method = lambda: 'PUT'
        url = self.opener.open(request)
        return json.loads(url.read())

    def upload_attachment(self, fileID, rev, up_file):
        """
        method to upload an attachment to an existing document in couchdb
        given document ID, current revision ID, and file name
        """
        with open(up_file, mode='r') as in_file:
            out_data =  in_file.read()
        request = urllib2.Request(self.url_address + fileID + "/" + up_file +"?rev=" + rev)
        request.add_header('Content-Type', 'text/plain')
        request.add_header('Content-Length', len(out_data))
        request.add_data(out_data)
        request.get_method = lambda: 'PUT'
        url = self.opener.open(request)
        return json.loads(url.read())

    def get_all_docs(self):
        """
        method to get all documents in couchdb ID list
        """
        request = urllib2.Request(self.url_address +'_all_docs')
        request.get_method = lambda : 'GET'
        request.add_header('Content-Type', 'text/plain')
        url = self.opener.open(request)
        return json.loads(url.read())
