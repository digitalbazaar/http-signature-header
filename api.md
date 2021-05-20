## Functions

<dl>
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

