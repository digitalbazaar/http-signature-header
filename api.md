<a name="module_http-signature-headers"></a>

## http-signature-headers

* [http-signature-headers](#module_http-signature-headers)
    * [~createSignatureInputString
Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.(options)](#module_http-signature-headers..createSignatureInputString
Takes in a strutured fields inner list containing a signatures inputs
and outputs a string to be signed.) ⇒ <code>string</code>
    * [~parseRequest
Takes in a request object and options and parses the signature inputs.(request, [options])](#module_http-signature-headers..parseRequest
Takes in a request object and options and parses the signature inputs.) ⇒ <code>Map.&lt;string, object&gt;</code>

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

