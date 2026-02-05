import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteSigningCertificate$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteSigningCertificateCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteSigningCertificate", {})
    .n("IAMClient", "DeleteSigningCertificateCommand")
    .sc(DeleteSigningCertificate$)
    .build() {
}
