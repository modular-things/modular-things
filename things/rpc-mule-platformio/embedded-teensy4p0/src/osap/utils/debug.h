
#ifndef OSAP_DEBUG_H_
#define OSAP_DEBUG_H_

#include "../runtime/runtime.h"

// debug w/ this...
#ifdef OSAP_CONFIG_INCLUDE_DEBUG_MSGS
#define OSAP_DEBUG(msg) OSAP_Runtime::debug(msg)
#define OSAP_DEBUG_PRINT_ROUTE(route) OSAP_Runtime::printRoute(route)
#else
#define OSAP_DEBUG(msg)
#endif

// genny error msgs w/ this...
#ifdef OSAP_CONFIG_INCLUDE_ERROR_MSGS
#define OSAP_ERROR(msg) OSAP_Runtime::error(msg)
#else
#define OSAP_ERROR(msg)
#endif

#endif 