#include "Application.h"
#include "exceptions.h"
#include "common_macros.h"
#include "objects/node/NodeSpotify.h"
#include "objects/node/NodePlaylist.h"
#include "objects/node/NodePlaylistContainer.h"
#include "objects/node/NodeTrack.h"
#include "objects/node/NodeTrackExtended.h"
#include "objects/node/NodePlayer.h"
#include "objects/node/NodeAlbum.h"
#include "objects/node/NodeArtist.h"
#include "objects/node/NodeSearch.h"
#include "objects/node/NodePlaylistFolder.h"
#include "objects/node/NodeUser.h"
#include "audio/audio.h"

#include <node.h>
#include <v8.h>

Application* application;

static Handle<Object> getInternal() {
  Local<Object> internal = Object::New();
  Local<Object> protos = Object::New();
  protos->Set(v8::String::NewSymbol("Playlist"), NodePlaylist::getConstructor());
  protos->Set(v8::String::NewSymbol("Track"), NodeTrack::getConstructor());
  protos->Set(v8::String::NewSymbol("TrackExtended"), NodeTrackExtended::getConstructor());
  protos->Set(v8::String::NewSymbol("PlaylistContainer"), NodePlaylistContainer::getConstructor());
  protos->Set(v8::String::NewSymbol("Artist"), NodeArtist::getConstructor());
  protos->Set(v8::String::NewSymbol("Album"), NodeAlbum::getConstructor());
  protos->Set(v8::String::NewSymbol("User"), NodeUser::getConstructor());
  protos->Set(v8::String::NewSymbol("PlaylistFolder"), NodePlaylistFolder::getConstructor());
  internal->Set(v8::String::NewSymbol("protos"), protos);
  return internal;
}

v8::Handle<v8::Value> CreateNodespotify(const v8::Arguments& args) {
  v8::HandleScope scope;

  //initiate the javascript ctors and prototypes
  NodePlaylist::init();
  NodeTrack::init();
  NodeTrackExtended::init();
  NodeArtist::init();
  NodePlayer::init();
  NodeAlbum::init();
  NodeSearch::init();
  NodeSpotify::init();
  NodePlaylistFolder::init();
  NodePlaylistContainer::init();
  NodeUser::init();

  //initialize application struct
  application = new Application();
  audio_init(&application->audio_fifo);

  //configure and create spotify session
  v8::Handle<v8::Object> options;
  if(args.Length() < 1) {
    options = v8::Object::New();
  } else {
    if(!args[0]->IsObject()) {
      return scope.Close(V8_EXCEPTION("Please provide an object to the node-spotify initializer function"));
    }
    options = args[0]->ToObject();
  }

  //Create nodeSpotify object
  NodeSpotify* nodeSpotify;
  try {
    nodeSpotify = new NodeSpotify(options);
  } catch (const FileException& e) {
    return scope.Close(V8_EXCEPTION("Appkey file not found"));
  } catch (const SessionCreationException& e) {
    return scope.Close(V8_EXCEPTION(e.message.c_str()));
  }
  v8::Handle<Object> spotifyObject = nodeSpotify->getV8Object();

  //Set some fields on the nodeSpotify object
  spotifyObject->Set(v8::String::NewSymbol("Search"), NodeSearch::getConstructor());//TODO: this is ugly but didn't work when done in the NodeSpotify ctor
  spotifyObject->Set(v8::String::NewSymbol("internal"), getInternal());
  NodePlayer* nodePlayer = new NodePlayer();
  spotifyObject->Set(v8::String::NewSymbol("player"), nodePlayer->getV8Object());
  return scope.Close(spotifyObject);
};

static void init(v8::Handle<v8::Object> exports, v8::Handle<v8::Object> module) {
  module->Set(v8::String::NewSymbol("exports"), v8::FunctionTemplate::New(CreateNodespotify)->GetFunction());
}

NODE_MODULE(nodespotify, init)