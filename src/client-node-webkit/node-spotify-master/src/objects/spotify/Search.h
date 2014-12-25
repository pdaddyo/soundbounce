#ifndef _SEARCH_RESULT_H
#define _SEARCH_RESULT_H

#include "Track.h"
#include "Album.h"
#include "Playlist.h"
#include "Artist.h"
#include "../node/V8Browseable.h"

#include <memory>
#include <vector>
#include <string>

class Search {
friend class NodeSearch;
friend class SearchCallbacks;
public:
  Search() {};
  Search(const Search& other);
  ~Search();
  std::vector<std::shared_ptr<Track>> getTracks();
  std::vector<std::shared_ptr<Album>> getAlbums();
  std::vector<std::shared_ptr<Artist>> getArtists();
  std::vector<std::shared_ptr<Playlist>> getPlaylists();
  void execute(std::string query, int trackOffset, int trackLimit,
    int albumOffset, int albumLimit,
    int artistOffset, int artistLimit,
    int playlistOffset, int playlistLimit);
  std::string link();
  std::string didYouMeanText();
  int totalTracks();
  int totalAlbums();
  int totalArtists();
  int totalPlaylists();
private:
  sp_search* search;
  V8Browseable* nodeObject;
};

#endif