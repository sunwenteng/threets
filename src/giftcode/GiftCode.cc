#include <node.h>
#include "stdio.h"
#include <iostream>

using namespace v8;

typedef long long int64;
typedef int int32;
typedef short int16;
typedef signed char int8;
typedef unsigned long long uint64;
typedef unsigned int uint32;
typedef unsigned short uint16;
typedef unsigned char uint8;

static const char digit[] = { '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A',
		'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P',
		'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' };

static const int size = 34;

std::string PREFIX = "BH";

static std::string NumToCode(uint64 num, uint32 shift) {
	std::string tmp;
	int t = 0;
	while (num) {
		tmp.append(1, digit[(num + shift) % size]);
		num /= size;
		if (++t % 4 == 0)
			tmp.append("-");
	}

	return std::string(tmp.rbegin(), tmp.rend());
}

std::string CalcGiftCode(uint32 dwId, uint32 dwIdx, uint32 dwParam1,
		uint32 dwParam2, uint32 dwParam3) {
	if (dwId >= 26 * 26 * 100 /** 2 digits (26 base) + 2 digits (10 base) */
	|| dwIdx > 1336335 /** 4 digits (34 base) */)
		return "Error";

	uint64 sum = 0;

	sum += dwIdx;
	sum = sum * 1003 + dwId;
	sum = sum * (dwParam1 % 109 + 1);

	uint64 t = dwParam2 % 100003 + 99881;

	for (int i = 0; i < 3; i++)
		t = (t << (8 - i)) | t;

	sum ^= t;

	std::string str;

	{
		uint32 v = ((PREFIX.at(0) - 'A') * 26 + (PREFIX.at(1) - 'A') + (dwId / 100)) % (26 * 26);
		str.append(1, (v / 26) + 'A');
		str.append(1, (v % 26) + 'A');
	}

	//	str.append( "YX" );

	char buf[16];

	sprintf(buf, "%02u-", dwId % 100);

	str.append(buf);

	std::string strIdx = NumToCode(dwIdx, 0);

	while (strIdx.length() < 4)
		strIdx.insert(0, "0");

	str.append(strIdx);

	str.append(NumToCode(sum, (dwIdx ^ dwParam3) % 34 + 1));

	return str;

}

bool FilterGiftCodeFormat(std::string& strCode, uint32& odwId, uint32& odwIdx) {
	size_t pos;

	while ((pos = strCode.find("-")) != std::string::npos) {
		strCode.replace(pos, 1, "");
	}

	if (strCode.length() != 16)
		return false;

	bool bFlag = false;

	for (int i = 0; i < 16; i++) {

		if ('1' <= strCode[i] && strCode[i] <= '9') {

		} else if ('a' <= strCode[i] && strCode[i] <= 'z') {
			strCode[i] = strCode[i] - 'a' + 'A';
		} else if ('A' <= strCode[i] && strCode[i] <= 'Z') {

		} else if (strCode[i] == '0') {
			if (bFlag)
				return false;
		} else {
			return false;
		}

		if (i >= 4 && strCode[i] != '0')
			bFlag = true;

		if (strCode[i] == 'O')
			return false;

	}

	for (int i = 0; i < 2; i++) {
		if (strCode[i] < 'A' || strCode[i] > 'Z')
			return false;
	}

	{
		uint32 v1 = (strCode[0] - 'A') * 26 + (strCode[1] - 'A');
		uint32 v2 = (PREFIX.at(0) - 'A') * 26 + (PREFIX.at(1) - 'A');
		uint32 v = (v1 >= v2 ? v1 - v2 : v1 + 26 * 26 - v2);
		odwId = v * 100;
	}

	//	if ( strCode[0] != 'Y' || strCode[1] != 'X' ) return false;
	if (strCode[2] < '0' || strCode[2] > '9')
		return false;
	if (strCode[3] < '0' || strCode[3] > '9')
		return false;

	odwId += (strCode[2] - '0') * 10 + (strCode[3] - '0');
	odwIdx = 0;

	for (int i = 4; i < 8; i++) {
		if (strCode[i] == '0')
			continue;

		odwIdx *= 34;

		if ('1' <= strCode[i] && strCode[i] <= '9') {
			odwIdx += (strCode[i] - '1');
		} else if ('A' <= strCode[i] && strCode[i] <= 'N') {
			odwIdx += (strCode[i] - 'A' + 9);
		} else {
			odwIdx += (strCode[i] - 'A' + 8);
		}
	}

	return true;
}

void JSInit(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);

	if (args.Length() < 1) {
		isolate->ThrowException(
				Exception::TypeError(
						String::NewFromUtf8(isolate,
								"Wrong number of arguments")));
		return;
	}

	if (!args[0]->IsString()) {
		isolate->ThrowException(
				Exception::TypeError(
						String::NewFromUtf8(isolate, "Wrong arguments")));
		return;
	}

	std::string prefix(*String::Utf8Value(args[0]->ToString()));
	bool ret = false;
	if (prefix.size() == 2) {
		ret = true;
		PREFIX = prefix;
	}

	args.GetReturnValue().Set(Boolean::New(isolate, ret));
}

void JSCalcGiftCode(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);

	if (args.Length() < 5) {
		isolate->ThrowException(
				Exception::TypeError(
						String::NewFromUtf8(isolate,
								"Wrong number of arguments")));
		return;
	}

	if (!args[0]->IsUint32() || !args[1]->IsUint32() || !args[2]->IsUint32()
			|| !args[3]->IsUint32() || !args[4]->IsUint32()
			|| !args[0]->IsUint32()) {
		isolate->ThrowException(
				Exception::TypeError(
						String::NewFromUtf8(isolate, "Wrong arguments")));
		return;
	}

	uint32 dwId, dwIdx, dwParam1, dwParam2, dwParam3;

	dwId = args[0]->Uint32Value();
	dwIdx = args[1]->Uint32Value();
	dwParam1 = args[2]->Uint32Value();
	dwParam2 = args[3]->Uint32Value();
	dwParam3 = args[4]->Uint32Value();

	const char* ret =
			CalcGiftCode(dwId, dwIdx, dwParam1, dwParam2, dwParam3).c_str();

	args.GetReturnValue().Set(String::NewFromUtf8(isolate, ret));
}

void JSFilterGiftCodeFormat(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);

	if (args.Length() < 2) {
		isolate->ThrowException(
				Exception::TypeError(
						String::NewFromUtf8(isolate,
								"Wrong number of arguments")));
		return;
	}

	if (!args[0]->IsString() || !args[1]->IsFunction()) {
		isolate->ThrowException(
				Exception::TypeError(
						String::NewFromUtf8(isolate, "Wrong arguments")));
		return;
	}

	Local<Function> cb = Local<Function>::Cast(args[1]);
	const unsigned argc = 3;

	bool valid = false;
	uint32 id = 0, idx = 0;
	std::string code(*String::Utf8Value(args[0]->ToString()));
	valid = FilterGiftCodeFormat(code, id, idx);

	Local<Value> argv[argc] = { Boolean::New(isolate, valid), Uint32::New(
			isolate, id), Uint32::New(isolate, idx) };
	cb->Call(isolate->GetCurrentContext()->Global(), argc, argv);
}

void init(Handle<Object> exports) {
	NODE_SET_METHOD(exports, "JSInit", JSInit);
	NODE_SET_METHOD(exports, "JSCalcGiftCode", JSCalcGiftCode);
	NODE_SET_METHOD(exports, "JSFilterGiftCodeFormat", JSFilterGiftCodeFormat);
}

NODE_MODULE(GiftCode, init)
