<a name="module_http-signature-headers"></a>

## http-signature-headers

* [http-signature-headers](#module_http-signature-headers)
    * [~createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header.(options)](#module_http-signature-headers..createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header.) ⇒ <code>string</code>
    * [~createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.(options)](#module_http-signature-headers..createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.) ⇒ <code>string</code>
    * [~parseRequest
Takes in a request object and options and parses the signature inputs.(request, [options])](#module_http-signature-headers..parseRequest
Takes in a request object and options and parses the signature inputs.) ⇒ <code>Map.&lt;string, object&gt;</code>
    * [~SignatureInput](#module_http-signature-headers..SignatureInput) : <code>object</code>

<a name="module_http-signature-headers..createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header."></a>

### http-signature-headers~createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header.(options) ⇒ <code>string</code>
**Kind**: inner method of [<code>http-signature-headers</code>](#module_http-signature-headers)  
**Returns**: <code>string</code> - A valid structured field dictionary header.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Options to use. |
| options.signatures | <code>Map.&lt;string, SignatureInput&gt;</code> | A map with a key    containing the sig name & a `SignatureInput`. |
| options.params | <code>object</code> | Global params such as created for each   signature entry in the resulting dictionary. |

**Example**  
```js
new Map([['sig1', {coveredContent: [], params: {alg: 'hs2019'}}]]);
```
**Example**  
```js
options.params = {created: 59999, expires: 99999, alg: 'hs2019'};
```
<a name="module_http-signature-headers..createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed."></a>

### http-signature-headers~createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.(options) ⇒ <code>string</code>
**Kind**: inner method of [<code>http-signature-headers</code>](#module_http-signature-headers)  
**Returns**: <code>string</code> - The string to be signed.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Options to use. |
| options.signatureInput | <code>object</code> | A structured field dictionary. |
| options.httpMessage | <code>object</code> | A request or response message. |

<a name="module_http-signature-headers..parseRequest
Takes in a request object and options and parses the signature inputs."></a>

### http-signature-headers~parseRequest
Takes in a request object and options and parses the signature inputs.(request, [options]) ⇒ <code>Map.&lt;string, object&gt;</code>
**Kind**: inner method of [<code>http-signature-headers</code>](#module_http-signature-headers)  
**Returns**: <code>Map.&lt;string, object&gt;</code> - A map with each signature as key & an object
  with the signature and signature inputs as properties.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| request | <code>object</code> |  | A request object. |
| [options] | <code>object</code> | <code>{}</code> | Options for parsing such as clockSkew. |

<a name="module_http-signature-headers..SignatureInput"></a>

### http-signature-headers~SignatureInput : <code>object</code>
**Kind**: inner typedef of [<code>http-signature-headers</code>](#module_http-signature-headers)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | Params for the Signature such as `alg`. |
| coveredContent | <code>Array.&lt;(Item\|string)&gt;</code> | An array of strings or  sf Items expected in the headers of speciality content fields. |

