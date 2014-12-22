#ifndef _PLAYER_H
#define _PLAYER_H

#include "Track.h"

#include <libspotify/api.h>
#include <memory>

class Player {
friend class NodePlayer;
friend class SessionCallbacks;
public:
  Player();
  void stop();
  void pause();
  void resume();
  void play(std::shared_ptr<Track> track);
  void playAndSeek(std::shared_ptr<Track> track, int position);
  void seek(int second);
  void setCurrentSecond(int second);
private:
  int currentSecond;
// added by PB to allow us to seek to exact position immediately after playing.
  int seekPositionAfterPlay;
  bool isPaused;
  bool isLoading;
  sp_track* loadingTrack;
  Player(const Player& other) {};
  static std::shared_ptr<Player> instance;
  void retryPlay();
};

#endif
