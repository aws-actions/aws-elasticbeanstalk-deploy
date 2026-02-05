import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteOpenIDConnectProvider$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteOpenIDConnectProviderCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteOpenIDConnectProvider", {})
    .n("IAMClient", "DeleteOpenIDConnectProviderCommand")
    .sc(DeleteOpenIDConnectProvider$)
    .build() {
}
