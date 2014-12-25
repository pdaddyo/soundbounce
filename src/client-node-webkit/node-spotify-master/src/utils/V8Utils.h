#ifndef _V8_UTILS_H
#define _V8_UTILS_H

#include <v8.h>

using namespace v8;

class V8Utils {
public:
  static Handle<Function> getFunctionFromObject(Handle<Object> callbacks, Handle<String> key); 
};

#endif