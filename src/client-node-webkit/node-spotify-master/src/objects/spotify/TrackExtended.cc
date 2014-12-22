#include "TrackExtended.h"

TrackExtended::TrackExtended(sp_track* _track, sp_playlist* _playlist, int _position) : Track(_track), playlist(_playlist), position(_position) {
  sp_playlist_add_ref(playlist);
}

TrackExtended::~TrackExtended() {
  sp_playlist_release(playlist);
}

std::shared_ptr<User> TrackExtended::creator() {
  std::shared_ptr<User> creator;
  sp_user* spCreator = sp_playlist_track_creator(playlist, position);
  if(spCreator != nullptr) {
    creator = std::make_shared<User>(spCreator);
  }
  return creator;
}

bool TrackExtended::seen() {
  return sp_playlist_track_seen(playlist, position);
}

void TrackExtended::seen(bool seen) {
  sp_playlist_track_set_seen(playlist, position, seen);
}

std::string TrackExtended::message()  {
  std::string message;
  const char* spMessage = sp_playlist_track_message(playlist, position);
  if(spMessage != nullptr) {
    message = std::string(spMessage);
  }
  return message;
}

double TrackExtended::createTime() {
  return sp_playlist_track_create_time(playlist, position);
}
