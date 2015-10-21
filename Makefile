BIN := node_modules/.bin

all: index.js applicators.js

$(BIN)/tsc:
	npm install

%.js: %.ts $(BIN)/tsc node_modules/node.d.ts
	$(BIN)/tsc

node_modules/node.d.ts:
	curl -s https://raw.githubusercontent.com/borisyankov/DefinitelyTyped/master/node/node.d.ts > $@
