/*
osap/osap.h

osap root / vport factory

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the squidworks and ponyo
projects. Copyright is retained and must be preserved. The work is provided as
is; no warranty is provided, and users accept all liability.
*/

#ifndef OSAP_H_
#define OSAP_H_

// our osap.h include is ~ just a pointer to whatever 
// components we are going to present at a "high level" 

#include "runtime/runtime.h"
#include "utils/debug.h"

// we could also do config-dependent include of various links...
#include "gateway_integrations/link_cobsUsbSerial.h"

// and of port types...
#include "port_integrations/port_named.h"
#include "port_integrations/port_deviceNames.h"
#include "port_integrations/port_messageEscape.h"
#include "port_integrations/port_onePipe.h"
#include "port_integrations/port_rpc.h"

#endif
