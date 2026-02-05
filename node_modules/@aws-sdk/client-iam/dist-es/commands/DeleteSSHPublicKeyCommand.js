import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteSSHPublicKey$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteSSHPublicKeyCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteSSHPublicKey", {})
    .n("IAMClient", "DeleteSSHPublicKeyCommand")
    .sc(DeleteSSHPublicKey$)
    .build() {
}
