import PropTypes from 'prop-types';
import React from 'react';
import { Analytics } from '@deriv-com/analytics';
import ErrorComponent from './index';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    componentDidCatch = (error, info) => {
        // Report the error to PostHog via the analytics wrapper. Wrapped in a
        // try/catch so reporting can never prevent the fallback UI from rendering.
        try {
            Analytics.trackEvent('error_boundary', {
                message: error.message,
                name: error.name,
                stack: error.stack,
                component_stack: info.componentStack,
            });
        } catch (reportingError) {
            // eslint-disable-next-line no-console
            console.error('Failed to report error to analytics:', reportingError);
        }

        this.setState({
            hasError: true,
            error,
            info,
        });
    };
    render = () => (this.state.hasError ? <ErrorComponent should_show_refresh={true} /> : this.props.children);
}

ErrorBoundary.propTypes = {
    root_store: PropTypes.object,
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};

export default ErrorBoundary;
