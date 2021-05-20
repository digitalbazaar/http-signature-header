## Objects

<dl>
<dt><a href="#http-signature-header">http-signature-header</a> : <code>object</code></dt>
<dd></dd>
</dl>

## Constants

<dl>
<dt><a href="#convertToSFInnerList">convertToSFInnerList</a> ⇒ <code><a href="#Item">Item</a></code></dt>
<dd><p>Converts coveredContent &amp; params to SF Items.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#createSignatureHeader
Takes in an object with keys as signature names and values Uint8Arrays.
The Uint8Array should be the result of signing the signatureInput string.">createSignatureHeader
Takes in an object with keys as signature names and values Uint8Arrays.
The Uint8Array should be the result of signing the signatureInput string.(signatures)</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header.">createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header.(options)</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.">createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.(options)</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#parseRequest

Takes in a request object and options and parses the signature inputs.">parseRequest

Takes in a request object and options and parses the signature inputs.(request, [options])</a> ⇒ <code>Map.&lt;string, object&gt;</code></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Item">Item</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#SignatureInput">SignatureInput</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="http-signature-header"></a>

## http-signature-header : <code>object</code>
**Kind**: global namespace  
<a name="convertToSFInnerList"></a>

## convertToSFInnerList ⇒ [<code>Item</code>](#Item)
Converts coveredContent & params to SF Items.

**Kind**: global constant  
**Returns**: [<code>Item</code>](#Item) - SF Items for signing and string construction.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Options to use. |
| options.coveredContent | <code>Array.&lt;(string\|Item)&gt;</code> | An array of content ids. |
| options.params | <code>object</code> | Parameters for the inner list itself. |

<a name="createSignatureHeader
Takes in an object with keys as signature names and values Uint8Arrays.
The Uint8Array should be the result of signing the signatureInput string."></a>

## createSignatureHeader
Takes in an object with keys as signature names and values Uint8Arrays.
The Uint8Array should be the result of signing the signatureInput string.(signatures) ⇒ <code>string</code>
**Kind**: global function  
**Returns**: <code>string</code> - An FS encoded dictionary with  sigs as SF Byte sequences.  
**See**

- [https://datatracker.ietf.org/doc/html/rfc8941#section-3.2](https://datatracker.ietf.org/doc/html/rfc8941#section-3.2)
For dictionaries.
- [https://datatracker.ietf.org/doc/html/rfc8941#section-3.3.5](https://datatracker.ietf.org/doc/html/rfc8941#section-3.3.5)
for Byte sequences.


| Param | Type | Description |
| --- | --- | --- |
| signatures | <code>object.&lt;string, Uint8Array&gt;</code> | An object with keys equal  to the signature name & the signature as a Uint8Array. |

<a name="createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header."></a>

## createSignatureInputHeader

Takes in a Map of signature inputs and outputs an sf dictionary header.(options) ⇒ <code>string</code>
**Kind**: global function  
**Returns**: <code>string</code> - A valid structured field dictionary header.  
**See**: [https://datatracker.ietf.org/doc/html/rfc8941#section-3.2](https://datatracker.ietf.org/doc/html/rfc8941#section-3.2)
For dictionaries.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Options to use. |
| options.signatures | <code>Map.&lt;string, SignatureInput&gt;</code> | A map with a key    containing the sig name & a SignatureInput. |
| options.params | <code>object</code> | An object with global params  for each signature input such as created. |

<a name="createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed."></a>

## createSignatureInputString

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.(options) ⇒ <code>string</code>
**Kind**: global function  
**Returns**: <code>string</code> - The string to be signed.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Options to use. |
| options.signatureInput | <code>object</code> | A structured field dictionary. |
| options.httpMessage | <code>object</code> | A request or response message. |

<a name="parseRequest

Takes in a request object and options and parses the signature inputs."></a>

## parseRequest

Takes in a request object and options and parses the signature inputs.(request, [options]) ⇒ <code>Map.&lt;string, object&gt;</code>
**Kind**: global function  
**Returns**: <code>Map.&lt;string, object&gt;</code> - A map with each signature as key & an object
  with the signature and signature inputs as properties.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| request | <code>object</code> |  | A request object. |
| [options] | <code>object</code> | <code>{}</code> | Options for parsing such as clockSkew. |

<a name="Item"></a>

## Item : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | Params for an item such as `key`. |
| value | <code>string</code> | The header field name or  speciality content identifier. |

<a name="SignatureInput"></a>

## SignatureInput : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | Params for the Signature such as `alg`. |
| coveredContent | <code>Array.&lt;(Item\|string)&gt;</code> | An array of strings or  sf Items expected in the headers or speciality content fields. |

