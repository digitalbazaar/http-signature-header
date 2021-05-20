## Classes

<dl>
<dt><a href="#http-signature-headers">http-signature-headers</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#http-signature-headers

Takes in a Map of signature inputs and outputs an sf dictionary header.createSignatureInputHeader">createSignatureInputHeader(options)</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#http-signature-headers

Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.createSignatureInputString">createSignatureInputString(options)</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#http-signature-headers

Takes in a request object and options and parses the signature inputs.parseRequest">parseRequest(request, [options])</a> ⇒ <code>Map.&lt;string, object&gt;</code></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Item">Item</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#SignatureInput">SignatureInput</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="http-signature-headers"></a>

## http-signature-headers
**Kind**: global class  
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

