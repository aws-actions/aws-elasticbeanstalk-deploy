import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListVirtualMFADevices$ } from "../schemas/schemas_0";
export { $Command };
export class ListVirtualMFADevicesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListVirtualMFADevices", {})
    .n("IAMClient", "ListVirtualMFADevicesCommand")
    .sc(ListVirtualMFADevices$)
    .build() {
}
