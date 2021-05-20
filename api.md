<a name="module_Api"></a>

## Api

* [Api](#module_Api)
    * [.createSignatureInputString](#module_Api.createSignatureInputString) ⇒ <code>string</code>
    * [.parseRequest](#module_Api.parseRequest) ⇒ <code>Map.&lt;string, object&gt;</code>

<a name="module_Api.createSignatureInputString"></a>

### Api.createSignatureInputString ⇒ <code>string</code>
Takes in a strutured fields inner list containing a signature's inputs
and outputs a string to be signed.

**Kind**: static constant of [<code>Api</code>](#module_Api)  
**Returns**: <code>string</code> - The string to be signed.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Options to use. |
| options.signatureInput | <code>object</code> | A structured field dictionary. |
| options.httpMessage | <code>object</code> | A request or response message. |

<a name="module_Api.parseRequest"></a>

### Api.parseRequest ⇒ <code>Map.&lt;string, object&gt;</code>
Takes in a request object and options and parses the signature inputs.

**Kind**: static constant of [<code>Api</code>](#module_Api)  
**Returns**: <code>Map.&lt;string, object&gt;</code> - A map with each signature as key & an object
  with the signature and signature inputs as properties.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| request | <code>object</code> |  | A request object. |
| [options] | <code>object</code> | <code>{}</code> | Options for parsing such as clockSkew. |

