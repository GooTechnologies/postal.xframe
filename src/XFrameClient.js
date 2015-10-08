import postal from "postal";
import _ from "lodash";
import { state, env } from "./state";

export default class XFrameClient extends postal.fedx.FederationClient {

	constructor( ...args ) {
		this.transportName = "xframe";
		super( ...args );
	}

	shouldProcess() {
		const hasDomainFilters = !!state.config.allowedOrigins.length;
		return state.config.enabled &&
			// another frame/window
			( ( this.options.origin === "*" || ( hasDomainFilters && _.contains( state.config.allowedOrigins, this.options.origin ) || !hasDomainFilters ) ) ||
			// worker
			( this.options.isWorker && _.contains( state.workers, this.target ) ) ||
			// we are in a worker
			env.isWorker );
	}

	send( packingSlip ) {
		if ( this.shouldProcess() ) {
			const target = this.target;
			const options = this.options;

			postal.fedx.transports.xframe.wrapForTransportAsync( packingSlip, function( wrappedPackingSlip ) {
				const origin = ( options.isWorker || env.isWorker ) ? null : options.origin;

				const envelope = !env.useEagerSerialize ? wrappedPackingSlip.packingSlip.envelope : null;
				const transferables = envelope ? envelope.transferables : null;

				if ( env.isWorker ) {
					const context = env.isWorker ? null : target;
					target.postMessage.call( context, wrappedPackingSlip, origin, transferables );
				} else {
					target.postMessage( wrappedPackingSlip, origin, transferables );
				}
			} );
		}
	}
}
