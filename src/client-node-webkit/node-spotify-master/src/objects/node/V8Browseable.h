#ifndef _V8_BROWSEABLE_H
#define _V8_BROWSEABLE_H

#include "V8Wrapped.h"

#include <v8.h>

class V8Browseable : public virtual V8Wrapped {
public:
  void callBrowseComplete() {
    unsigned int argc = 2;
    v8::Handle<v8::Value> argv[2] = {v8::Undefined(), this->getV8Object()};
    browseCompleteCallback->Call(v8::Context::GetCurrent()->Global(), argc, argv);
  }
protected:
  v8::Handle<v8::Function> browseCompleteCallback;
};

#endif