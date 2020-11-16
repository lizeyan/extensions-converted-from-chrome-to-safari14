1. open Edge (Chrome) extension folder, e.g.,  `/Users/username/Library/Application Support/Microsoft Edge/Default/Extensions`
2. find your extensions:
```bash
grep "notion" */*/manifest.json
```
3. convert extension for Safari, e.g.,
```bash
/Applications/Xcode.app/Contents/Developer/usr/bin/safari-web-extension-converter '/Users/lizytalk/Library/Application Support/Microsoft Edge/Default/Extensions/knheggckgoiihginacbkhaalnibhilkk/0.2.3_0' --copy-resources --no-open
```
