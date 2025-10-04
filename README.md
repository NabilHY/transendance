## Authorization Code Flow


![Authrz Code Flow](./AuthorizationCodeFlowPKEC.png)

```py
- A : User try to login using oauth provider (googl, github...)

- B : Client request the Authorization URL From backend oauthAPIs.

- C : The endpoint use PKEC (Proof key for code Exchange) in order to
prevent Authrization code interception attack by generating code verifier 
and code Challenge then respense with the Authorization URL + code challenge,
then the user redirected to login/autorization prompt.

- D : After the user grants permission, Oauth provider redirects 
back to your callback URL with an authorization code.
- Client callback component sends this code to backend

- E-F :backend exchanges the code and code verifier with AUTH Tenant for an access token
```
transendance
